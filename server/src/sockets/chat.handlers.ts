/**
 * Chat socket handlers for real-time chat functionality.
 *
 * - Handles chat room join/leave.
 * - Broadcasts messages to project members.
 * - Enforces access control and rate limiting.
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import { Types } from 'mongoose';
import logger from '../utils/logger.js';
import * as chatService from '../modules/chat/chat.service.js';
import Project from '../models/Project.model.js';
import ProjectMember from '../models/ProjectMember.model.js';

// Track chat room participants
const chatRoomParticipants = new Map<string, Set<string>>();

// Rate limiting: track message count per user per minute
const messageRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 30; // 30 messages per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * Check if user can send a message (rate limiting).
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = messageRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    messageRateLimit.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Check if user has access to project chat.
 */
async function checkChatAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project) {
    return false;
  }

  // Check if user is owner
  if (project.ownerId.toString() === userId) {
    return true;
  }

  // Check if user is a member
  const isMember = await ProjectMember.exists({
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  });

  return isMember !== null;
}

/**
 * Set up chat event handlers for a socket.
 */
export function setupChatHandlers(socket: Socket, io: SocketIOServer): void {
  const userId = socket.data.user?.id;
  const email = socket.data.user?.email;

  if (!userId || !email) {
    return;
  }

  // Join chat room
  socket.on('chat:join', async (data: { projectId: string }, callback) => {
    try {
      const { projectId } = data;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return callback?.({ success: false, error: 'Invalid project ID' });
      }

      // Check access
      const hasAccess = await checkChatAccess(projectId, userId);
      if (!hasAccess) {
        logger.warn('Unauthorized chat join attempt', {
          socketId: socket.id,
          userId,
          projectId,
        });
        return callback?.({ success: false, error: 'Access denied' });
      }

      // Create chat room ID
      const chatRoomId = `chat:${projectId}`;

      // Join Socket.IO room
      await socket.join(chatRoomId);

      // Track participant
      if (!chatRoomParticipants.has(chatRoomId)) {
        chatRoomParticipants.set(chatRoomId, new Set());
      }
      chatRoomParticipants.get(chatRoomId)!.add(socket.id);

      logger.info('User joined chat room', {
        socketId: socket.id,
        userId,
        chatRoomId,
      });

      // Notify other participants
      socket.to(chatRoomId).emit('chat:user-joined', {
        userId,
        email,
        socketId: socket.id,
      });

      callback?.({ success: true, chatRoomId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Chat join error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to join chat' });
    }
  });

  // Leave chat room
  socket.on('chat:leave', async (data: { projectId: string }, callback) => {
    try {
      const { projectId } = data;
      const chatRoomId = `chat:${projectId}`;

      // Leave Socket.IO room
      await socket.leave(chatRoomId);

      // Remove participant tracking
      const participants = chatRoomParticipants.get(chatRoomId);
      if (participants) {
        participants.delete(socket.id);

        // Notify other participants
        socket.to(chatRoomId).emit('chat:user-left', {
          userId,
          socketId: socket.id,
        });

        // Clean up empty rooms
        if (participants.size === 0) {
          chatRoomParticipants.delete(chatRoomId);
        }
      }

      logger.info('User left chat room', {
        socketId: socket.id,
        userId,
        chatRoomId,
      });

      callback?.({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Chat leave error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to leave chat' });
    }
  });

  // Send message
  socket.on('chat:message', async (data: { projectId: string; content: string }, callback) => {
    try {
      const { projectId, content } = data;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return callback?.({ success: false, error: 'Invalid project ID' });
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        return callback?.({ success: false, error: 'Message content is required' });
      }

      if (content.length > 2000) {
        return callback?.({ success: false, error: 'Message too long (max 2000 characters)' });
      }

      // Check rate limit
      if (!checkRateLimit(userId)) {
        return callback?.({ success: false, error: 'Rate limit exceeded. Please wait before sending more messages.' });
      }

      // Check access
      const hasAccess = await checkChatAccess(projectId, userId);
      if (!hasAccess) {
        return callback?.({ success: false, error: 'Access denied' });
      }

      // Create and persist message
      const message = await chatService.createMessage(projectId, userId, content);

      const chatRoomId = `chat:${projectId}`;

      // Broadcast to all participants in the chat room
      io.to(chatRoomId).emit('chat:message:new', {
        messageId: message.id,
        projectId,
        senderId: userId,
        senderEmail: email,
        content: message.content,
        createdAt: message.createdAt,
      });

      logger.info('Chat message sent', {
        messageId: message.id,
        projectId,
        userId,
      });

      callback?.({ success: true, message });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Chat message error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  // Request message history
  socket.on('chat:history', async (data: { projectId: string; limit?: number; before?: string }, callback) => {
    try {
      const { projectId, limit = 50, before } = data;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return callback?.({ success: false, error: 'Invalid project ID' });
      }

      // Check access
      const hasAccess = await checkChatAccess(projectId, userId);
      if (!hasAccess) {
        return callback?.({ success: false, error: 'Access denied' });
      }

      // Get message history
      const history = await chatService.getMessageHistory(projectId, userId, limit, before);

      callback?.({ success: true, ...history });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Chat history error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to retrieve message history' });
    }
  });

  // Delete message
  socket.on('chat:message:delete', async (data: { messageId: string }, callback) => {
    try {
      const { messageId } = data;

      // Delete message
      await chatService.deleteMessage(messageId, userId);

      // Broadcast deletion to all participants
      // Note: We need to find the projectId from the message first
      // For simplicity, we'll broadcast to all chat rooms the user is in
      for (const [chatRoomId, participants] of chatRoomParticipants.entries()) {
        if (participants.has(socket.id)) {
          io.to(chatRoomId).emit('chat:message:deleted', { messageId });
        }
      }

      logger.info('Chat message deleted', {
        messageId,
        userId,
      });

      callback?.({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Chat delete error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to delete message' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove from all chat rooms
    for (const [chatRoomId, participants] of chatRoomParticipants.entries()) {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);

        // Notify other participants
        socket.to(chatRoomId).emit('chat:user-left', {
          userId,
          socketId: socket.id,
        });

        // Clean up empty rooms
        if (participants.size === 0) {
          chatRoomParticipants.delete(chatRoomId);
        }
      }
    }
  });
}

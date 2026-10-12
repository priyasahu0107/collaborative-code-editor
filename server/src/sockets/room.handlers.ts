/**
 * Room handlers for Socket.IO collaboration rooms.
 * 
 * Handles joining, leaving, and managing collaboration rooms.
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import { Types } from 'mongoose';
import Project from '../models/Project.model.js';
import File from '../models/File.model.js';
import logger from '../utils/logger.js';
import { getOrCreateDocument, cleanupDocument } from '../modules/collaboration/collaboration.service.js';

// Track participants in each room
const roomParticipants = new Map<string, Map<string, { userId: string; email: string }>>();

/**
 * Set up room event handlers for a socket.
 */
export function setupRoomHandlers(socket: Socket, io: SocketIOServer): void {
  // Join collaboration room
  socket.on('room:join', async (data: { projectId: string; fileId: string }, callback) => {
    try {
      const { projectId, fileId } = data;
      const userId = socket.data.user?.id;
      const email = socket.data.user?.email;

      if (!userId || !email) {
        logger.warn('Unauthorized room join attempt', { socketId: socket.id });
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Validate IDs
      if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(fileId)) {
        logger.warn('Invalid room IDs', { socketId: socket.id, projectId, fileId });
        return callback?.({ success: false, error: 'Invalid IDs' });
      }

      // Verify project ownership
      const project = await Project.findOne({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(userId),
      });

      if (!project) {
        logger.warn('Unauthorized project access', { 
          socketId: socket.id, 
          userId, 
          projectId 
        });
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Verify file belongs to project
      const file = await File.findOne({
        _id: new Types.ObjectId(fileId),
        projectId: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(userId),
      });

      if (!file) {
        logger.warn('Unauthorized file access', { 
          socketId: socket.id, 
          userId, 
          fileId 
        });
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Create room ID
      const roomId = `${projectId}:${fileId}`;

      // Join Socket.IO room
      await socket.join(roomId);

      // Track participant
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }
      roomParticipants.get(roomId)!.set(socket.id, { userId, email });

      // Get or create Yjs document
      const doc = await getOrCreateDocument(projectId, fileId);

      logger.info('User joined collaboration room', { 
        socketId: socket.id, 
        userId, 
        roomId,
        participantCount: roomParticipants.get(roomId)?.size || 0
      });

      // Notify other participants
      socket.to(roomId).emit('room:participant-joined', {
        userId,
        email,
        socketId: socket.id,
      });

      // Send success response with current participants
      const participants = Array.from(roomParticipants.get(roomId)?.entries() || []).map(
        ([socketId, participant]) => ({
          socketId,
          userId: participant.userId,
          email: participant.email,
        })
      );

      callback?.({ 
        success: true, 
        roomId,
        participants 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Room join error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to join room' });
    }
  });

  // Leave collaboration room
  socket.on('room:leave', async (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Leave Socket.IO room
      await socket.leave(roomId);

      // Remove participant tracking
      const participants = roomParticipants.get(roomId);
      if (participants) {
        participants.delete(socket.id);
        
        // Notify other participants
        socket.to(roomId).emit('room:participant-left', {
          userId,
          socketId: socket.id,
        });

        // Clean up room if empty
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
          await cleanupDocument(roomId);
          logger.info('Room cleaned up (no participants)', { roomId });
        }
      }

      logger.info('User left collaboration room', { 
        socketId: socket.id, 
        userId, 
        roomId 
      });

      callback?.({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Room leave error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Failed to leave room' });
    }
  });

  // Handle socket disconnect
  socket.on('disconnect', async () => {
    const userId = socket.data.user?.id;
    
    // Remove from all rooms
    for (const [roomId, participants] of roomParticipants.entries()) {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        
        // Notify other participants
        socket.to(roomId).emit('room:participant-left', {
          userId,
          socketId: socket.id,
        });

        // Clean up room if empty
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
          await cleanupDocument(roomId);
          logger.info('Room cleaned up on disconnect', { roomId });
        }
      }
    }
  });
}

/**
 * Get participants in a room.
 */
export function getRoomParticipants(roomId: string): Array<{ socketId: string; userId: string; email: string }> {
  const participants = roomParticipants.get(roomId);
  if (!participants) {
    return [];
  }
  
  return Array.from(participants.entries()).map(([socketId, participant]) => ({
    socketId,
    userId: participant.userId,
    email: participant.email,
  }));
}

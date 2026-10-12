/**
 * Chat service for managing chat messages.
 *
 * - Creates and persists chat messages.
 * - Retrieves message history with pagination.
 * - Enforces project membership checks.
 */

import { Types } from 'mongoose';
import Message from '../../models/Message.model.js';
import Project from '../../models/Project.model.js';
import ProjectMember from '../../models/ProjectMember.model.js';
import User from '../../models/User.model.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Check if user has access to project chat.
 */
export async function checkChatAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
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
 * Create a new chat message.
 */
export async function createMessage(
  projectId: string,
  senderId: string,
  content: string
): Promise<any> {
  // Validate content length
  if (content.length > 2000) {
    throw new AppError('Message content cannot exceed 2000 characters', 400);
  }

  // Check access
  const hasAccess = await checkChatAccess(projectId, senderId);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  // Create message
  const message = new Message({
    projectId: new Types.ObjectId(projectId),
    senderId: new Types.ObjectId(senderId),
    content: content.trim(),
  });

  await message.save();

  // Populate sender info
  await message.populate('senderId', 'name email');

  logger.info('Chat message created', {
    messageId: message._id,
    projectId,
    senderId,
  });

  return message.toSafeJSON();
}

/**
 * Get message history for a project.
 */
export async function getMessageHistory(
  projectId: string,
  userId: string,
  limit: number = 50,
  before?: string
): Promise<{ messages: any[]; hasMore: boolean }> {
  // Check access
  const hasAccess = await checkChatAccess(projectId, userId);
  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  // Build query
  const query: any = {
    projectId: new Types.ObjectId(projectId),
  };

  // Add cursor for pagination
  if (before) {
    const beforeMessage = await Message.findById(before);
    if (beforeMessage) {
      query.createdAt = { $lt: beforeMessage.createdAt };
    }
  }

  // Get messages (limit + 1 to check if there are more)
  const messages = await Message.find(query)
    .populate('senderId', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .exec();

  const hasMore = messages.length > limit;
  const resultMessages = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: resultMessages.map((m) => m.toSafeJSON()),
    hasMore,
  };
}

/**
 * Delete a chat message.
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<void> {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Only sender can delete their own message
  if (message.senderId.toString() !== userId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  await Message.findByIdAndDelete(messageId);

  logger.info('Chat message deleted', {
    messageId: message._id,
    projectId: message.projectId,
    userId,
  });
}

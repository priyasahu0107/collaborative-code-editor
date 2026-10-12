/**
 * Collaboration handlers for Yjs document synchronization over Socket.IO.
 * 
 * Handles document updates, awareness, and synchronization.
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import * as Y from 'yjs';
import logger from '../utils/logger.js';
import { 
  getOrCreateDocument, 
  getDocumentState, 
  applyUpdate,
  flushDocument 
} from '../modules/collaboration/collaboration.service.js';

// Track awareness state per room
const roomAwareness = new Map<string, Map<string, any>>();

/**
 * Set up collaboration event handlers for a socket.
 */
export function setupCollaborationHandlers(socket: Socket, io: SocketIOServer): void {
  // Handle Yjs document sync request
  socket.on('collab:sync-request', async (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Verify socket is in the room
      const rooms = await socket.rooms;
      if (!rooms.has(roomId)) {
        logger.warn('Sync request from non-room member', { socketId: socket.id, roomId });
        return callback?.({ success: false, error: 'Not in room' });
      }

      // Get document state
      const state = getDocumentState(roomId);
      if (!state) {
        return callback?.({ success: false, error: 'Document not found' });
      }

      // Send state to requesting client
      callback?.({ 
        success: true, 
        state: Array.from(state) 
      });

      logger.debug('Sent document state', { socketId: socket.id, roomId, stateSize: state.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Sync request error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Sync failed' });
    }
  });

  // Handle Yjs document update
  socket.on('collab:update', async (data: { roomId: string; update: number[] }) => {
    try {
      const { roomId, update } = data;
      const userId = socket.data.user?.id;

      if (!userId) {
        return;
      }

      // Verify socket is in the room
      const rooms = await socket.rooms;
      if (!rooms.has(roomId)) {
        logger.warn('Update from non-room member', { socketId: socket.id, roomId });
        return;
      }

      // Convert update to Uint8Array
      const updateArray = new Uint8Array(update);

      // Apply update to document
      const success = applyUpdate(roomId, updateArray);
      if (!success) {
        logger.error('Failed to apply update', { socketId: socket.id, roomId });
        return;
      }

      // Broadcast update to other participants
      socket.to(roomId).emit('collab:update', {
        roomId,
        update,
        userId,
      });

      logger.debug('Broadcast document update', { 
        socketId: socket.id, 
        roomId, 
        updateSize: update.length 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Update error', { socketId: socket.id, error: message });
    }
  });

  // Handle awareness update
  socket.on('collab:awareness', async (data: { roomId: string; awareness: any }) => {
    try {
      const { roomId, awareness } = data;
      const userId = socket.data.user?.id;

      if (!userId) {
        return;
      }

      // Verify socket is in the room
      const rooms = await socket.rooms;
      if (!rooms.has(roomId)) {
        return;
      }

      // Store awareness state
      if (!roomAwareness.has(roomId)) {
        roomAwareness.set(roomId, new Map());
      }
      roomAwareness.get(roomId)!.set(socket.id, {
        ...awareness,
        userId,
        socketId: socket.id,
      });

      // Broadcast awareness to other participants
      socket.to(roomId).emit('collab:awareness', {
        roomId,
        socketId: socket.id,
        userId,
        awareness,
      });

      logger.debug('Broadcast awareness', { socketId: socket.id, roomId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Awareness error', { socketId: socket.id, error: message });
    }
  });

  // Handle manual save request
  socket.on('collab:save', async (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback?.({ success: false, error: 'Unauthorized' });
      }

      // Verify socket is in the room
      const rooms = await socket.rooms;
      if (!rooms.has(roomId)) {
        return callback?.({ success: false, error: 'Not in room' });
      }

      // Flush pending persistence
      await flushDocument(roomId);

      logger.info('Manual save triggered', { socketId: socket.id, roomId });
      callback?.({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Save error', { socketId: socket.id, error: message });
      callback?.({ success: false, error: 'Save failed' });
    }
  });

  // Handle disconnect - clean up awareness
  socket.on('disconnect', () => {
    // Remove awareness from all rooms
    for (const [roomId, awarenessMap] of roomAwareness.entries()) {
      if (awarenessMap.has(socket.id)) {
        awarenessMap.delete(socket.id);
        
        // Notify other participants
        socket.to(roomId).emit('collab:awareness-remove', {
          roomId,
          socketId: socket.id,
        });
      }
    }
  });
}

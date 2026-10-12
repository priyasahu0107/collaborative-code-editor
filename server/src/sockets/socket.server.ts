/**
 * Socket.IO server setup and initialization.
 * 
 * Integrates Socket.IO with the existing HTTP server.
 * Handles authentication, room management, and collaboration events.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';
import { authenticateSocket } from './socket.auth.js';
import { setupRoomHandlers } from './room.handlers.js';
import { setupCollaborationHandlers } from './collaboration.handlers.js';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server.
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    logger.warn('Socket.IO already initialized');
    return io;
  }

  const env = getEnv();

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket: Socket) => {
    logger.info('Client connected', { socketId: socket.id, userId: socket.data.user?.id });

    // Set up room handlers
    setupRoomHandlers(socket, io!);

    // Set up collaboration handlers
    setupCollaborationHandlers(socket, io!);

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', { 
        socketId: socket.id, 
        userId: socket.data.user?.id,
        reason 
      });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error', { 
        socketId: socket.id, 
        error: error.message 
      });
    });
  });

  logger.info('Socket.IO server initialized');

  return io;
}

/**
 * Get the Socket.IO server instance.
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Close Socket.IO server.
 */
export async function closeSocketIO(): Promise<void> {
  if (io) {
    logger.info('Closing Socket.IO server');
    io.close();
    io = null;
  }
}

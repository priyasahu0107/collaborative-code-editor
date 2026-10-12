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
import { setupChatHandlers } from './chat.handlers.js';

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

    // Set up chat handlers
    setupChatHandlers(socket, io!);

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
 * Close Socket.IO server gracefully.
 * 
 * This function performs a graceful shutdown by:
 * 1. Notifying all connected clients about the impending shutdown
 * 2. Waiting for active operations to complete (with timeout)
 * 3. Closing all rooms and connections
 * 4. Cleaning up resources
 */
export async function closeSocketIO(): Promise<void> {
  if (!io) {
    logger.debug('Socket.IO server already closed');
    return;
  }

  logger.info('Starting graceful Socket.IO shutdown');

  try {
    // Step 1: Notify all connected clients about shutdown
    const connectedSockets = Array.from(io.sockets.sockets.values());
    const socketCount = connectedSockets.length;
    
    if (socketCount > 0) {
      logger.info(`Notifying ${socketCount} connected clients about shutdown`);
      
      // Send shutdown notification to all clients
      await io.emit('server:shutdown', {
        message: 'Server is shutting down. Please save your work and reconnect.',
        timestamp: new Date().toISOString(),
      });

      // Wait a bit for clients to receive the notification
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Disconnect all sockets gracefully
    const disconnectPromises = connectedSockets.map(async (socket) => {
      try {
        // Disconnect the socket with a custom reason
        socket.disconnect(true);
        logger.debug(`Disconnected socket ${socket.id}`);
      } catch (error) {
        logger.error(`Error disconnecting socket ${socket.id}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Wait for all disconnections with a timeout
    await Promise.race([
      Promise.all(disconnectPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Socket disconnection timeout')), 5000)
      ),
    ]).catch((error) => {
      logger.warn('Socket disconnection timeout or error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Step 3: Close the Socket.IO server
    logger.info('Closing Socket.IO server');
    
    await new Promise<void>((resolve, reject) => {
      io!.close((err) => {
        if (err) {
          logger.error('Error closing Socket.IO server', {
            error: err.message,
          });
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Step 4: Clean up
    io = null;
    
    logger.info('Socket.IO server closed successfully');
  } catch (error) {
    logger.error('Error during Socket.IO graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Force cleanup even if graceful shutdown failed
    if (io) {
      try {
        io.close();
      } catch (closeError) {
        logger.error('Error during forced Socket.IO close', {
          error: closeError instanceof Error ? closeError.message : 'Unknown error',
        });
      }
      io = null;
    }
    
    throw error;
  }
}

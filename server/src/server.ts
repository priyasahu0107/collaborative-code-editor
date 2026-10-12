/**
 * Server entry point.
 *
 * - Loads and validates environment configuration.
 * - Connects to MongoDB when configured.
 * - Starts the Express HTTP server.
 * - Initializes Socket.IO for real-time collaboration.
 * - Handles graceful shutdown (SIGINT, SIGTERM).
 *
 * Startup policy:
 * - Development: Server starts even without MongoDB (database-disabled mode).
 * - Production: Fails fast if MongoDB is required but unavailable.
 * - Test: Does not connect to database or bind to a real port.
 */

import http from 'http';
import app from './app.js';
import { loadEnv, isProduction, isTest } from './config/env.js';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from './config/database.js';
import { initializeSocketIO, closeSocketIO } from './sockets/socket.server.js';
import { ensureAllIndexes } from './scripts/ensureIndexes.js';
import logger from './utils/logger.js';

// Track whether shutdown is in progress to prevent duplicate handling
let isShuttingDown = false;
let httpServer: http.Server | null = null;

/**
 * Start the server.
 */
async function start(): Promise<void> {
  try {
    // 1. Load and validate environment
    const env = loadEnv();
    logger.info('Environment configuration loaded', {
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      databaseConfigured: Boolean(env.MONGODB_URI),
      authConfigured: Boolean(env.JWT_SECRET),
    });

    // Validate JWT_SECRET in production
    if (isProduction() && !env.JWT_SECRET) {
      logger.error('Production startup aborted: JWT_SECRET is required but not configured.');
      process.exit(1);
    }

    // 2. Connect to database (if configured)
    if (!isTest()) {
      try {
        await connectDatabase();
        
        // 2.5. Ensure all required indexes exist
        if (getDatabaseStatus() === 'connected') {
          try {
            await ensureAllIndexes();
          } catch (indexError) {
            const message = indexError instanceof Error ? indexError.message : 'Unknown error';
            logger.error('Database index verification failed', { error: message });
            
            if (isProduction()) {
              // In production, index failure is fatal
              logger.error('Production startup aborted: database indexes could not be verified.');
              process.exit(1);
            }
            
            // In development, continue with warning
            logger.warn('Continuing startup with unverified database indexes (development mode).');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database connection failed during startup', { error: message });

        if (isProduction()) {
          // In production, database failure is fatal
          logger.error('Production startup aborted: database is required but unavailable.');
          process.exit(1);
        }

        // In development, continue without database
        logger.warn('Continuing startup without database connection (development mode).');
      }
    }

    // 3. Start HTTP server
    const port = env.PORT;
    httpServer = http.createServer(app);

    await new Promise<void>((resolve, reject) => {
      httpServer!.on('error', reject);
      httpServer!.listen(port, '0.0.0.0', () => {
        resolve();
      });
    });

    const dbStatus = getDatabaseStatus();
    logger.info(`🚀 Server started successfully`, {
      port,
      environment: env.NODE_ENV,
      database: dbStatus,
      healthEndpoint: `http://localhost:${port}/api/v1/health`,
    });

    // 4. Initialize Socket.IO for real-time collaboration
    if (!isTest()) {
      initializeSocketIO(httpServer!);
      logger.info('Socket.IO initialized for real-time collaboration');
    }

    // 5. Set up graceful shutdown handlers
    setupShutdownHandlers();

    // 6. Handle unhandled rejections and exceptions
    setupProcessHandlers();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown startup error';
    logger.error('Server startup failed', { error: message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close Socket.IO server
  try {
    await closeSocketIO();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during Socket.IO shutdown', { error: message });
  }

  // Stop accepting new connections
  if (httpServer) {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connection
  try {
    await disconnectDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during database disconnect', { error: message });
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

/**
 * Register SIGINT and SIGTERM handlers.
 */
function setupShutdownHandlers(): void {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Register handlers for unhandled rejections and exceptions.
 */
function setupProcessHandlers(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error('Unhandled promise rejection', { reason: message });
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', { error: error.message, name: error.name });
    // Give logger time to flush, then exit
    setTimeout(() => process.exit(1), 1000);
  });
}

// Start the server (only when this file is executed directly)
const argv1 = process.argv[1];
const isMainModule =
  argv1 !== undefined &&
  (argv1.endsWith('/server.ts') || argv1.endsWith('/server.js'));

if (isMainModule) {
  start();
}

export { start, shutdown };
export default app;

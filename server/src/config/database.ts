/**
 * MongoDB Atlas connection module using Mongoose.
 *
 * - Reads connection URI from validated environment configuration.
 * - Supports database-disabled mode when MONGODB_URI is not set (development).
 * - Prevents duplicate connections.
 * - Handles connection errors, disconnection, and reconnection.
 * - Never logs credentials or full connection URIs.
 * - Does not auto-connect on import — must be called explicitly.
 */

import mongoose from 'mongoose';
import { getEnv, isDatabaseConfigured } from './env.js';
import logger from '../utils/logger.js';

export type DatabaseStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'disabled';

interface DatabaseState {
  status: DatabaseStatus;
  error: string | null;
}

const state: DatabaseState = {
  status: 'disconnected',
  error: null,
};

let connectionPromise: Promise<void> | null = null;

/**
 * Get the current database connection status.
 */
export function getDatabaseStatus(): DatabaseStatus {
  return state.status;
}

/**
 * Get the full database state (status + error message).
 */
export function getDatabaseState(): DatabaseState {
  return { ...state };
}

/**
 * Check if the database is connected and ready.
 */
export function isDatabaseConnected(): boolean {
  return state.status === 'connected';
}

/**
 * Connect to MongoDB Atlas.
 *
 * If MONGODB_URI is not configured:
 * - In development: enters "disabled" mode, server can still start.
 * - In production: throws an error (database is required).
 *
 * If connection fails:
 * - Sets status to "error" with a safe diagnostic message.
 * - Does not expose credentials in the error.
 */
export async function connectDatabase(): Promise<void> {
  // Prevent duplicate connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  // Already connected
  if (state.status === 'connected') {
    return;
  }

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    const env = getEnv();
    if (env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI is required in production but not configured');
    }
    // Development/test mode: database disabled
    state.status = 'disabled';
    state.error = null;
    logger.warn('MongoDB URI not configured. Running in database-disabled mode.');
    return;
  }

  connectionPromise = _performConnection();
  return connectionPromise;
}

async function _performConnection(): Promise<void> {
  const env = getEnv();
  const uri = env.MONGODB_URI!;

  state.status = 'connecting';
  state.error = null;

  // Mask URI for logging (show only protocol and host, not credentials)
  const maskedUri = _maskUri(uri);
  logger.info(`Connecting to MongoDB...`, { uri: maskedUri });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    state.status = 'connected';
    state.error = null;
    logger.info('MongoDB connected successfully', { uri: maskedUri });

    // Set up event handlers
    _setupConnectionHandlers();
  } catch (error) {
    state.status = 'error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
    // Provide a safe diagnostic without exposing credentials
    state.error = _sanitizeConnectionError(errorMessage);
    logger.error('MongoDB connection failed', { error: state.error, uri: maskedUri });
    connectionPromise = null; // Allow retry
    throw new Error(`Database connection failed: ${state.error}`);
  }
}

function _setupConnectionHandlers(): void {
  mongoose.connection.on('disconnected', () => {
    state.status = 'disconnected';
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    state.status = 'error';
    state.error = _sanitizeConnectionError(err.message);
    logger.error('MongoDB connection error', { error: state.error });
  });

  mongoose.connection.on('reconnected', () => {
    state.status = 'connected';
    state.error = null;
    logger.info('MongoDB reconnected');
  });
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  if (state.status === 'disabled' || state.status === 'disconnected') {
    return;
  }

  try {
    await mongoose.disconnect();
    state.status = 'disconnected';
    state.error = null;
    connectionPromise = null;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during MongoDB disconnect', { error: errorMessage });
  }
}

/**
 * Mask a MongoDB URI for safe logging.
 * Shows only the protocol and hostname, hides credentials and database name.
 */
function _maskUri(uri: string): string {
  try {
    // Handle mongodb+srv:// and mongodb:// URIs
    const url = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    const protocol = uri.startsWith('mongodb+srv://') ? 'mongodb+srv' : 'mongodb';
    return `${protocol}://${url.hostname}[credentials-hidden]`;
  } catch {
    return 'mongodb://[invalid-uri]';
  }
}

/**
 * Sanitize a connection error message to avoid leaking credentials.
 */
function _sanitizeConnectionError(message: string): string {
  // Remove any potential URI or credential info from error messages
  const sanitized = message
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://[hidden]')
    .replace(/password=[^\s&]+/gi, 'password=[hidden]');

  // Provide common diagnostic hints
  if (sanitized.includes('ENOTFOUND') || sanitized.includes('getaddrinfo')) {
    return 'Could not resolve database host. Check MONGODB_URI hostname.';
  }
  if (sanitized.includes('ECONNREFUSED')) {
    return 'Connection refused. Is the database server running?';
  }
  if (sanitized.includes('authentication')) {
    return 'Authentication failed. Check database credentials.';
  }
  if (sanitized.includes('timeout') || sanitized.includes('ETIMEDOUT')) {
    return 'Connection timed out. Check network connectivity and firewall rules.';
  }

  return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
}

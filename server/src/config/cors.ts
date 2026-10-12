/**
 * CORS configuration for the Express application.
 *
 * - Restricts origins to configured CLIENT_URL.
 * - Supports multiple comma-separated origins.
 * - Enables credentials for cookie-based authentication.
 * - Never uses wildcard origin with credentials.
 */

import type { CorsOptions } from 'cors';
import { getEnv } from './env.js';
import logger from '../utils/logger.js';

/**
 * Get the list of allowed origins from configuration.
 */
function getAllowedOrigins(): string[] {
  const env = getEnv();
  return env.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean);
}

/**
 * Build CORS options for Express.
 */
export function getCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, curl, mobile apps)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from unauthorized origin', { origin });
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400, // 24 hours
  };
}

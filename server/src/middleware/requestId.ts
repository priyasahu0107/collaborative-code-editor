/**
 * Request ID middleware
 * 
 * Generates a unique request ID for each incoming request and attaches it to the request object.
 * This ID is used for logging, tracing, and debugging purposes.
 * Uses AsyncLocalStorage to maintain request context across async operations.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithRequestId } from '../utils/logger.js';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to generate and attach request ID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = randomUUID();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers for client reference
  res.setHeader('X-Request-ID', requestId);
  
  // Run the rest of the request handling in the request context
  runWithRequestId(requestId, () => {
    next();
  });
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string {
  return req.requestId || 'unknown';
}

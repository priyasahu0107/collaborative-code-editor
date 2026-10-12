/**
 * Centralized error handling middleware.
 *
 * - Distinguishes validation errors, not-found errors, and internal errors.
 * - Never exposes stack traces in production.
 * - Uses consistent error response format.
 * - Logs errors safely without leaking credentials.
 */

import type { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Custom application error with HTTP status code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error (400) for input validation failures.
 */
export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error (404).
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Standard error response format.
 */
interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Centralized error handling middleware.
 * Must be registered after all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    message = err.message;
    code = 'VALIDATION_ERROR';
    details = err.details;
  } else if (err instanceof NotFoundError) {
    statusCode = err.statusCode;
    message = err.message;
    code = 'NOT_FOUND';
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.isOperational ? err.message : 'Internal server error';
    code = err.name.toUpperCase();
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parse error from express.json()
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // Log the error (safe — logger redacts sensitive fields)
  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      name: err.name,
      statusCode,
      code,
    });
  } else {
    logger.warn('Client error', {
      message: err.message,
      statusCode,
      code,
    });
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    message,
    error: {
      code,
      statusCode,
    },
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  // In development, include stack trace for 500 errors (not in production)
  if (!isProduction() && statusCode >= 500 && err.stack) {
    (response.error as Record<string, unknown>)['stack'] = err.stack;
  }

  res.status(statusCode).json(response);
}

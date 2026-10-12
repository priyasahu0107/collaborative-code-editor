/**
 * 404 Not Found middleware.
 *
 * Returns a consistent JSON response for unmatched routes.
 * Must be registered after all route handlers.
 */

import type { Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND',
      statusCode: 404,
    },
  });
}

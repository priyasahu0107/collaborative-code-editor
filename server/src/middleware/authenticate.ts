/**
 * Authentication middleware.
 *
 * Verifies JWT from HTTP-only cookie and attaches user context to request.
 */

import type { Request, Response, NextFunction } from 'express';
import { getEnv, isAuthConfigured } from '../config/env.js';
import { verifyToken } from '../modules/auth/auth.service.js';
import { AppError } from './errorHandler.js';
import type { AuthContext } from '../modules/auth/auth.types.js';

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Authentication middleware.
 *
 * Extracts JWT from HTTP-only cookie, verifies it, and attaches user context.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!isAuthConfigured()) {
      throw new AppError('Authentication not configured', 500);
    }

    const env = getEnv();
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token);

    // Attach auth context to request
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
}

/**
 * Optional authentication middleware.
 *
 * Attempts to authenticate but does not fail if no token is present.
 * Useful for routes that work for both authenticated and anonymous users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!isAuthConfigured()) {
      return next();
    }

    const env = getEnv();
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      return next();
    }

    const payload = verifyToken(token);

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    // Ignore authentication errors for optional auth
    next();
  }
}

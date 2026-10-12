/**
 * Authentication controller.
 *
 * Handles registration, login, logout, and current user endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { getEnv } from '../../config/env.js';
import {
  registerUser,
  authenticateUser,
  generateToken,
  getUserProfile,
  findUserById,
} from './auth.service.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/v1/auth/register
 *
 * Register a new user.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid registration data', validationResult.error.flatten());
    }

    const { name, email, password } = validationResult.data;

    // Register user
    const user = await registerUser(name, email, password);

    // Generate JWT
    const token = generateToken(user);

    // Set HTTP-only cookie
    const env = getEnv();
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 15 * 60 * 1000, // 15 minutes (matches JWT_EXPIRES_IN default)
      path: '/',
    });

    // Return user profile
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: getUserProfile(user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid login data', validationResult.error.flatten());
    }

    const { email, password } = validationResult.data;

    // Authenticate user
    const user = await authenticateUser(email, password);

    // Generate JWT
    const token = generateToken(user);

    // Set HTTP-only cookie
    const env = getEnv();
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Return user profile
    res.json({
      success: true,
      message: 'Login successful',
      data: getUserProfile(user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Clear authentication cookie.
 */
export function logout(req: Request, res: Response): void {
  const env = getEnv();

  // Clear cookie with matching attributes
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
  });

  logger.info('User logged out', { userId: req.auth?.userId });

  res.json({
    success: true,
    message: 'Logout successful',
  });
}

/**
 * GET /api/v1/auth/me
 *
 * Get current authenticated user profile.
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        error: {
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
      return;
    }

    const user = await findUserById(req.auth.userId);

    res.json({
      success: true,
      message: 'Current user retrieved',
      data: getUserProfile(user),
    });
  } catch (error) {
    next(error);
  }
}

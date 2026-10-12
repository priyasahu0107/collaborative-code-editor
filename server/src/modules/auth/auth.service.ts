/**
 * Authentication service.
 *
 * Handles user registration, login, JWT generation, and token verification.
 */

import jwt from 'jsonwebtoken';
import User, { type IUser } from '../../models/User.model.js';
import { getEnv, isAuthConfigured } from '../../config/env.js';
import logger from '../../utils/logger.js';
import type { JwtPayload, UserProfileResponse } from './auth.types.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Register a new user.
 *
 * @throws {AppError} If email already exists or registration fails.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<IUser> {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Create new user (password will be hashed by pre-save hook)
  const user = new User({
    name,
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save hook
  });

  try {
    await user.save();
    logger.info('User registered successfully', { email: user.email, userId: user._id });
    return user;
  } catch (error) {
    // Handle duplicate key error
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      throw new AppError('Email already registered', 409);
    }
    throw error;
  }
}

/**
 * Authenticate a user and return the user document.
 *
 * @throws {AppError} If credentials are invalid.
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<IUser> {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Generic error to prevent email enumeration
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 403);
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  logger.info('User authenticated successfully', { email: user.email, userId: user._id });
  return user;
}

/**
 * Generate a JWT token for a user.
 *
 * @throws {AppError} If JWT configuration is missing.
 */
export function generateToken(user: IUser): string {
  if (!isAuthConfigured()) {
    throw new AppError('Authentication not configured', 500);
  }

  const env = getEnv();
  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
  };

  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN,
  };

  if (env.JWT_ISSUER) {
    options.issuer = env.JWT_ISSUER;
  }

  if (env.JWT_AUDIENCE) {
    options.audience = env.JWT_AUDIENCE;
  }

  return jwt.sign(payload, env.JWT_SECRET!, options);
}

/**
 * Verify and decode a JWT token.
 *
 * @throws {AppError} If token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  if (!isAuthConfigured()) {
    throw new AppError('Authentication not configured', 500);
  }

  const env = getEnv();

  try {
    const verifyOptions: jwt.VerifyOptions = {};

    if (env.JWT_ISSUER) {
      verifyOptions.issuer = env.JWT_ISSUER;
    }

    if (env.JWT_AUDIENCE) {
      verifyOptions.audience = env.JWT_AUDIENCE;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET!, verifyOptions) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    throw new AppError('Authentication failed', 401);
  }
}

/**
 * Get user profile from user document.
 */
export function getUserProfile(user: IUser): UserProfileResponse {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Find user by ID.
 *
 * @throws {AppError} If user not found.
 */
export async function findUserById(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
}

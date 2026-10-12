/**
 * Rate limiting middleware.
 *
 * Uses express-rate-limit to prevent abuse of authentication endpoints.
 */

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Authentication rate limiter.
 *
 * Limits login and registration attempts to prevent brute force attacks.
 * Uses IP address as the key.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * General API rate limiter.
 *
 * Limits general API requests to prevent abuse.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Execution rate limiter.
 *
 * Limits code execution requests to prevent abuse and resource exhaustion.
 * More restrictive than general API limits since execution is expensive.
 * Uses authenticated user ID as the key for per-user limits.
 */
export const executionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 execution requests per user per window
  message: {
    success: false,
    message: 'Too many execution requests. Please try again later.',
    error: {
      code: 'EXECUTION_RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use authenticated user ID for per-user rate limiting
    // Falls back to IP if user is not authenticated (should not happen for protected routes)
    return req.auth?.userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

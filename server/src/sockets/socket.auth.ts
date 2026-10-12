/**
 * Socket.IO authentication middleware.
 * 
 * Verifies JWT token from cookies and attaches user data to socket.
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Authenticate socket connection using JWT from cookies.
 */
export function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  try {
    const env = getEnv();
    
    // Check if JWT_SECRET is configured
    if (!env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured for socket authentication');
      return next(new Error('Authentication not configured'));
    }

    // Extract token from cookies
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      logger.warn('No cookies provided for socket authentication', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    // Parse cookies
    const cookies = parseCookies(cookieHeader);
    const token = cookies[env.COOKIE_NAME];

    if (!token) {
      logger.warn('No auth token found in cookies', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const verifyOptions: jwt.VerifyOptions = {};
    if (env.JWT_ISSUER) {
      verifyOptions.issuer = env.JWT_ISSUER;
    }
    if (env.JWT_AUDIENCE) {
      verifyOptions.audience = env.JWT_AUDIENCE;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET, verifyOptions) as {
      sub: string;
      email: string;
    };

    // Attach user data to socket
    socket.data.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    logger.info('Socket authenticated', { 
      socketId: socket.id, 
      userId: decoded.sub 
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Socket authentication failed: token expired', { socketId: socket.id });
      return next(new Error('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Socket authentication failed: invalid token', { socketId: socket.id });
      return next(new Error('Invalid token'));
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Socket authentication error', { 
      socketId: socket.id, 
      error: message 
    });
    next(new Error('Authentication failed'));
  }
}

/**
 * Parse cookie header string into object.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const parts = cookieHeader.split(';');
  
  for (const part of parts) {
    const [name, value] = part.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  }
  
  return cookies;
}

/**
 * Authentication type definitions.
 */

/**
 * JWT payload structure.
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Authentication context attached to requests by auth middleware.
 */
export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Registration request body.
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Login request body.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Safe user profile response (no password hash).
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Centralized environment configuration and validation.
 *
 * Uses Zod to validate all environment variables at startup.
 * - In development: MongoDB URI is optional (server can start without DB).
 * - In production: MongoDB URI and JWT_SECRET are required.
 * - EXECUTION_SERVICE_URL is optional (execution service not yet used).
 * - Never exposes credentials in logs or errors.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root (two levels up from config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Transform empty strings to undefined for optional fields
const preprocessSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().refine(
      (uri) => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'),
      { message: 'MONGODB_URI must be a valid MongoDB connection string' },
    ).optional(),
  ),
  // Authentication configuration
  JWT_SECRET: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  ),
  JWT_ISSUER: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().optional(),
  ),
  JWT_AUDIENCE: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().optional(),
  ),
  JWT_EXPIRES_IN: z.string().default('15m'),
  // Cookie configuration
  COOKIE_NAME: z.string().default('auth_token'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  // Execution service (optional)
  EXECUTION_SERVICE_URL: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : val),
    z.string().url().optional(),
  ),
});

export type EnvConfig = z.infer<typeof preprocessSchema>;

let cachedConfig: EnvConfig | null = null;

/**
 * Load and validate environment configuration.
 *
 * @throws {Error} If validation fails in production with missing required vars.
 * @returns Validated environment configuration.
 */
export function loadEnv(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = preprocessSchema.safeParse(process.env);

  if (!result.success) {
    const isProduction = process.env['NODE_ENV'] === 'production';
    const failedFields = Object.keys(result.error.flatten().fieldErrors);

    if (isProduction) {
      console.error(
        `[ENV] Configuration validation failed in production. Invalid fields: ${failedFields.join(', ')}`,
      );
      throw new Error(
        `Environment configuration invalid. Check required variables: ${failedFields.join(', ')}`,
      );
    }

    // In development/test, throw with clear message about what's wrong
    throw new Error(
      `Environment configuration invalid: ${result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    );
  }

  cachedConfig = result.data;
  return result.data;
}

/**
 * Get the already-loaded configuration.
 * Throws if loadEnv() has not been called yet.
 */
export function getEnv(): EnvConfig {
  if (!cachedConfig) {
    throw new Error('Environment not loaded. Call loadEnv() first.');
  }
  return cachedConfig;
}

/**
 * Check if MongoDB is configured (URI is present).
 */
export function isDatabaseConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.MONGODB_URI);
}

/**
 * Check if JWT authentication is configured.
 */
export function isAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.JWT_SECRET);
}

/**
 * Check if running in production mode.
 */
export function isProduction(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode.
 */
export function isDevelopment(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'development';
}

/**
 * Check if running in test mode.
 */
export function isTest(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'test';
}

/**
 * Reset cached config (for testing purposes only).
 */
export function resetEnv(): void {
  cachedConfig = null;
}

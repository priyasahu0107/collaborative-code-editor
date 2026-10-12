/**
 * Authentication validation schemas using Zod.
 */

import { z } from 'zod';

/**
 * Registration schema.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
});

/**
 * Login schema.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

/**
 * Type exports.
 */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

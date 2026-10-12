/**
 * Project validation schemas using Zod.
 */

import { z } from 'zod';

/**
 * Project creation schema.
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  defaultLanguage: z
    .string()
    .trim()
    .max(50, 'Language identifier cannot exceed 50 characters')
    .default('javascript'),
});

/**
 * Project update schema.
 */
export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name must be at least 1 character')
      .max(100, 'Project name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .nullable(),
    defaultLanguage: z
      .string()
      .trim()
      .max(50, 'Language identifier cannot exceed 50 characters')
      .optional(),
    visibility: z.enum(['private', 'public']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Project list query schema.
 */
export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * MongoDB ObjectId validation.
 */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format');

/**
 * Type exports.
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQueryInput = z.infer<typeof listProjectsQuerySchema>;

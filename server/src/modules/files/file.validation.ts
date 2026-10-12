/**
 * File validation schemas using Zod.
 */

import { z } from 'zod';
import { MAX_FILE_CONTENT_SIZE, MAX_NESTING_DEPTH } from '../../models/File.model.js';

/**
 * File/folder creation schema.
 */
export const createFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'File name is required')
    .max(255, 'File name cannot exceed 255 characters')
    .refine((name) => !name.includes('/') && !name.includes('\\'), {
      message: 'File name cannot contain path separators',
    })
    .refine((name) => name !== '.' && name !== '..', {
      message: 'Invalid file name',
    }),
  path: z
    .string()
    .trim()
    .max(1000, 'Path cannot exceed 1000 characters')
    .optional()
    .default(''),
  type: z.enum(['file', 'folder']),
  language: z
    .string()
    .trim()
    .max(50, 'Language identifier cannot exceed 50 characters')
    .optional(),
  content: z
    .string()
    .max(MAX_FILE_CONTENT_SIZE, `Content cannot exceed ${MAX_FILE_CONTENT_SIZE} characters`)
    .optional()
    .default(''),
});

/**
 * File update schema (with optimistic concurrency).
 */
export const updateFileSchema = z
  .object({
    content: z
      .string()
      .max(MAX_FILE_CONTENT_SIZE, `Content cannot exceed ${MAX_FILE_CONTENT_SIZE} characters`)
      .optional(),
    language: z
      .string()
      .trim()
      .max(50, 'Language identifier cannot exceed 50 characters')
      .optional(),
    version: z.number().int().min(1, 'Version must be at least 1'),
  })
  .refine((data) => data.content !== undefined || data.language !== undefined, {
    message: 'At least one field (content or language) must be provided',
  });

/**
 * File rename schema.
 */
export const renameFileSchema = z.object({
  newName: z
    .string()
    .trim()
    .min(1, 'New name is required')
    .max(255, 'Name cannot exceed 255 characters')
    .refine((name) => !name.includes('/') && !name.includes('\\'), {
      message: 'Name cannot contain path separators',
    })
    .refine((name) => name !== '.' && name !== '..', {
      message: 'Invalid name',
    }),
});

/**
 * File list query schema.
 */
export const listFilesQuerySchema = z.object({
  path: z.string().trim().max(1000).optional().default(''),
  type: z.enum(['file', 'folder']).optional(),
  recursive: z.coerce.boolean().default(false),
});

/**
 * MongoDB ObjectId validation.
 */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

/**
 * Validate path to prevent traversal attacks.
 */
export function validatePath(path: string): void {
  // Reject absolute paths
  if (path.startsWith('/') || path.startsWith('\\')) {
    throw new Error('Absolute paths are not allowed');
  }

  // Reject null bytes
  if (path.includes('\0')) {
    throw new Error('Path cannot contain null bytes');
  }

  // Reject path traversal
  const segments = path.split('/').filter((s) => s.length > 0);
  for (const segment of segments) {
    if (segment === '..') {
      throw new Error('Path traversal (..) is not allowed');
    }
    if (segment === '.') {
      throw new Error('Current directory (.) is not allowed in path');
    }
  }

  // Check nesting depth
  if (segments.length > MAX_NESTING_DEPTH) {
    throw new Error(`Maximum nesting depth (${MAX_NESTING_DEPTH}) exceeded`);
  }
}

/**
 * Normalize a path by removing trailing slashes and collapsing multiple slashes.
 */
export function normalizePath(path: string): string {
  return path
    .split('/')
    .filter((s) => s.length > 0)
    .join('/');
}

/**
 * Build full path from parent path and name.
 */
export function buildFullPath(parentPath: string, name: string): string {
  const normalizedParent = normalizePath(parentPath);
  if (normalizedParent === '') {
    return name;
  }
  return `${normalizedParent}/${name}`;
}

/**
 * Get parent path from a full path.
 */
export function getParentPath(fullPath: string): string {
  const segments = fullPath.split('/').filter((s) => s.length > 0);
  segments.pop();
  return segments.join('/');
}

/**
 * Check if a path is a descendant of another path.
 */
export function isDescendantPath(childPath: string, parentPath: string): boolean {
  if (parentPath === '') return true;
  const normalizedParent = normalizePath(parentPath);
  const normalizedChild = normalizePath(childPath);
  return normalizedChild.startsWith(`${normalizedParent}/`);
}

/**
 * Type exports.
 */
export type CreateFileInput = z.infer<typeof createFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type RenameFileInput = z.infer<typeof renameFileSchema>;
export type ListFilesQueryInput = z.infer<typeof listFilesQuerySchema>;

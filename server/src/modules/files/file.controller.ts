/**
 * File controller - handles HTTP requests for file management.
 */

import type { Request, Response, NextFunction } from 'express';
import {
  createFile,
  listFiles,
  getFileById,
  updateFile,
  renameFile,
  deleteFile,
} from './file.service.js';
import {
  createFileSchema,
  updateFileSchema,
  renameFileSchema,
  listFilesQuerySchema,
  objectIdSchema,
  validatePath,
} from './file.validation.js';
import { ValidationError } from '../../middleware/errorHandler.js';

/**
 * POST /api/v1/projects/:projectId/files
 * Create a new file or folder.
 */
export async function createFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate projectId
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    // Validate request body
    const validationResult = createFileSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid file data', validationResult.error.flatten());
    }

    // Validate path if provided
    if (validationResult.data.path) {
      try {
        validatePath(validationResult.data.path);
      } catch (error) {
        throw new ValidationError(error instanceof Error ? error.message : 'Invalid path');
      }
    }

    const file = await createFile(
      req.params.projectId,
      req.auth.userId,
      validationResult.data,
    );

    res.status(201).json({
      success: true,
      message: 'File created successfully',
      data: file.toSafeJSON(false),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/projects/:projectId/files
 * List files in a project.
 */
export async function listFilesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate projectId
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    // Validate query parameters
    const validationResult = listFilesQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.flatten());
    }

    const files = await listFiles(
      req.params.projectId,
      req.auth.userId,
      validationResult.data,
    );

    res.json({
      success: true,
      message: 'Files retrieved successfully',
      data: files.map((f) => f.toSafeJSON(false)),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/projects/:projectId/files/:fileId
 * Get a single file with content.
 */
export async function getFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate IDs
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    const fileIdValidation = objectIdSchema.safeParse(req.params.fileId);
    if (!fileIdValidation.success) {
      throw new ValidationError('Invalid file ID format');
    }

    const file = await getFileById(
      req.params.projectId,
      req.params.fileId,
      req.auth.userId,
    );

    res.json({
      success: true,
      message: 'File retrieved successfully',
      data: file.toSafeJSON(true), // Include content
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/projects/:projectId/files/:fileId
 * Update file content.
 */
export async function updateFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate IDs
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    const fileIdValidation = objectIdSchema.safeParse(req.params.fileId);
    if (!fileIdValidation.success) {
      throw new ValidationError('Invalid file ID format');
    }

    // Validate request body
    const validationResult = updateFileSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid update data', validationResult.error.flatten());
    }

    const file = await updateFile(
      req.params.projectId,
      req.params.fileId,
      req.auth.userId,
      validationResult.data,
    );

    res.json({
      success: true,
      message: 'File updated successfully',
      data: file.toSafeJSON(true),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/projects/:projectId/files/:fileId/rename
 * Rename a file or folder.
 */
export async function renameFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate IDs
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    const fileIdValidation = objectIdSchema.safeParse(req.params.fileId);
    if (!fileIdValidation.success) {
      throw new ValidationError('Invalid file ID format');
    }

    // Validate request body
    const validationResult = renameFileSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid rename data', validationResult.error.flatten());
    }

    const file = await renameFile(
      req.params.projectId,
      req.params.fileId,
      req.auth.userId,
      validationResult.data.newName,
    );

    res.json({
      success: true,
      message: 'File renamed successfully',
      data: file.toSafeJSON(false),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/projects/:projectId/files/:fileId
 * Delete a file or folder.
 */
export async function deleteFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate IDs
    const projectIdValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!projectIdValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    const fileIdValidation = objectIdSchema.safeParse(req.params.fileId);
    if (!fileIdValidation.success) {
      throw new ValidationError('Invalid file ID format');
    }

    await deleteFile(req.params.projectId, req.params.fileId, req.auth.userId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

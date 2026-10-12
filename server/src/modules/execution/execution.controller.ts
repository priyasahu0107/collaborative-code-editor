/**
 * Execution controller
 * 
 * Handles execution API requests with proper authentication and authorization.
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { validateExecuteCodeRequest } from './execution.validation.js';
import {
  checkExecutionServiceHealth,
  executeCode,
  getSupportedLanguages,
} from './execution.service.js';
import { Project } from '../../models/Project.model.js';
import { File } from '../../models/File.model.js';
import { ProjectMember } from '../../models/ProjectMember.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import { EXECUTION_ERRORS } from './execution.types.js';

/**
 * Check if user has execution permission for a project
 */
async function checkExecutionPermission(userId: string, projectId: string): Promise<void> {
  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if user is the owner
  if (project.ownerId.toString() === userId) {
    return;
  }

  // Check if user is a member with editor role
  const membership = await ProjectMember.findOne({
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  });

  if (!membership) {
    throw new AppError('Access denied', 403);
  }

  if (membership.role !== 'editor') {
    throw new AppError('Only editors can execute code', 403);
  }
}

/**
 * POST /api/v1/execution/execute
 * Execute code in a project context
 */
export async function executeCodeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Validate request
    const validatedData = validateExecuteCodeRequest(req.body);

    // Check execution permission
    await checkExecutionPermission(userId, validatedData.projectId);

    // If fileId is provided, verify it belongs to the project
    if (validatedData.fileId) {
      const file = await File.findOne({
        _id: validatedData.fileId,
        projectId: validatedData.projectId,
      });

      if (!file) {
        throw new AppError('File not found', 404);
      }
    }

    // Execute code
    const result = await executeCode(
      validatedData.code,
      validatedData.language,
      validatedData.stdin,
      validatedData.timeout
    );

    logger.info('Code executed successfully', {
      userId,
      projectId: validatedData.projectId,
      language: validatedData.language,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof Error) {
      logger.error('Execution error', { error: error.message });
      const statusCode = error.message === EXECUTION_ERRORS.EXECUTION_DISABLED ? 503 : 500;
      next(new AppError(error.message, statusCode));
    } else {
      next(new AppError('Execution failed', 500));
    }
  }
}

/**
 * GET /api/v1/execution/languages
 * Get list of supported languages
 */
export async function getLanguagesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const languages = await getSupportedLanguages();
    
    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    logger.error('Failed to get languages', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next(new AppError('Failed to get supported languages', 500));
  }
}

/**
 * GET /api/v1/execution/health
 * Check execution service health
 */
export async function healthCheckHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await checkExecutionServiceHealth();
    
    res.json({
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    next(new AppError('Health check failed', 500));
  }
}

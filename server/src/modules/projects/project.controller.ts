/**
 * Project controller - handles HTTP requests for project management.
 */

import type { Request, Response, NextFunction } from 'express';
import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from './project.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  objectIdSchema,
} from './project.validation.js';
import { ValidationError } from '../../middleware/errorHandler.js';

/**
 * POST /api/v1/projects
 * Create a new project.
 */
export async function createProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate request body
    const validationResult = createProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid project data', validationResult.error.flatten());
    }

    const project = await createProject(req.auth.userId, validationResult.data);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/projects
 * List projects for the authenticated user.
 */
export async function listProjectsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate query parameters
    const validationResult = listProjectsQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.flatten());
    }

    const { projects, total } = await listProjects(req.auth.userId, validationResult.data);

    const { page, limit } = validationResult.data;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: {
        projects: projects.map((p) => p.toSafeJSON()),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/projects/:projectId
 * Get a single project by ID.
 */
export async function getProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate projectId
    const idValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!idValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    const project = await getProjectById(req.params.projectId, req.auth.userId);

    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: project.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/projects/:projectId
 * Update a project.
 */
export async function updateProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate projectId
    const idValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!idValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    // Validate request body
    const validationResult = updateProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid update data', validationResult.error.flatten());
    }

    const project = await updateProject(
      req.params.projectId,
      req.auth.userId,
      validationResult.data,
    );

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/projects/:projectId
 * Delete a project and all associated files.
 */
export async function deleteProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.auth) {
      throw new ValidationError('Authentication required');
    }

    // Validate projectId
    const idValidation = objectIdSchema.safeParse(req.params.projectId);
    if (!idValidation.success) {
      throw new ValidationError('Invalid project ID format');
    }

    await deleteProject(req.params.projectId, req.auth.userId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

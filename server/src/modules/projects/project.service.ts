/**
 * Project service - business logic for project management.
 */

import { Types } from 'mongoose';
import Project, { type IProject } from '../../models/Project.model.js';
import File from '../../models/File.model.js';
import { AppError, NotFoundError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsQueryInput,
} from './project.types.js';

/**
 * Create a new project.
 */
export async function createProject(
  ownerId: string,
  data: CreateProjectInput,
): Promise<IProject> {
  const project = new Project({
    name: data.name,
    description: data.description,
    ownerId: new Types.ObjectId(ownerId),
    defaultLanguage: data.defaultLanguage || 'javascript',
  });

  await project.save();

  logger.info('Project created', {
    projectId: project._id,
    ownerId,
    name: project.name,
  });

  return project;
}

/**
 * List projects for a user with pagination and filtering.
 */
export async function listProjects(
  ownerId: string,
  query: ListProjectsQueryInput,
): Promise<{ projects: IProject[]; total: number }> {
  const { page, limit, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, unknown> = {
    ownerId: new Types.ObjectId(ownerId),
  };

  // Add search filter if provided
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Build sort
  const sort: Record<string, 1 | -1> = {
    [sortBy]: sortOrder === 'asc' ? 1 : -1,
  };

  // Execute query
  const [projects, total] = await Promise.all([
    Project.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    Project.countDocuments(filter).exec(),
  ]);

  return { projects, total };
}

/**
 * Get a single project by ID with ownership verification.
 */
export async function getProjectById(
  projectId: string,
  ownerId: string,
): Promise<IProject> {
  // Validate ObjectId format
  if (!Types.ObjectId.isValid(projectId)) {
    throw new NotFoundError('Project not found');
  }

  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Update lastOpenedAt
  project.lastOpenedAt = new Date();
  await project.save();

  return project;
}

/**
 * Update a project with ownership verification.
 */
export async function updateProject(
  projectId: string,
  ownerId: string,
  data: UpdateProjectInput,
): Promise<IProject> {
  // Validate ObjectId format
  if (!Types.ObjectId.isValid(projectId)) {
    throw new NotFoundError('Project not found');
  }

  // Build update object (only allowed fields)
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.defaultLanguage !== undefined) updateData.defaultLanguage = data.defaultLanguage;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;

  const project = await Project.findOneAndUpdate(
    {
      _id: new Types.ObjectId(projectId),
      ownerId: new Types.ObjectId(ownerId),
    },
    { $set: updateData },
    { new: true, runValidators: true },
  ).exec();

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  logger.info('Project updated', {
    projectId: project._id,
    ownerId,
    updatedFields: Object.keys(updateData),
  });

  return project;
}

/**
 * Delete a project and all associated files with ownership verification.
 */
export async function deleteProject(
  projectId: string,
  ownerId: string,
): Promise<void> {
  // Validate ObjectId format
  if (!Types.ObjectId.isValid(projectId)) {
    throw new NotFoundError('Project not found');
  }

  const projectObjectId = new Types.ObjectId(projectId);
  const ownerObjectId = new Types.ObjectId(ownerId);

  // Verify ownership and delete project
  const result = await Project.deleteOne({
    _id: projectObjectId,
    ownerId: ownerObjectId,
  }).exec();

  if (result.deletedCount === 0) {
    throw new NotFoundError('Project not found');
  }

  // Delete all associated files
  const fileResult = await File.deleteMany({
    projectId: projectObjectId,
    ownerId: ownerObjectId,
  }).exec();

  logger.info('Project deleted', {
    projectId,
    ownerId,
    filesDeleted: fileResult.deletedCount,
  });
}

/**
 * Verify project ownership (utility for file operations).
 */
export async function verifyProjectOwnership(
  projectId: string,
  ownerId: string,
): Promise<IProject> {
  if (!Types.ObjectId.isValid(projectId)) {
    throw new NotFoundError('Project not found');
  }

  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return project;
}

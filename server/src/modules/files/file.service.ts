/**
 * File service - business logic for file and folder management.
 */

import { Types } from 'mongoose';
import File, {
  type IFile,
  MAX_FILES_PER_PROJECT,
  MAX_NESTING_DEPTH,
} from '../../models/File.model.js';
import { verifyProjectOwnership } from '../projects/project.service.js';
import { AppError, NotFoundError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import {
  validatePath,
  normalizePath,
  buildFullPath,
  getParentPath,
  isDescendantPath,
} from './file.validation.js';
import type {
  CreateFileInput,
  UpdateFileInput,
  ListFilesQueryInput,
} from './file.types.js';

/**
 * Create a new file or folder.
 */
export async function createFile(
  projectId: string,
  ownerId: string,
  data: CreateFileInput,
): Promise<IFile> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Validate parent path
  const parentPath = normalizePath(data.path);
  if (parentPath) {
    validatePath(parentPath);

    // Check if parent folder exists
    const parentFolder = await File.findOne({
      projectId: new Types.ObjectId(projectId),
      path: parentPath,
      type: 'folder',
    }).exec();

    if (!parentFolder) {
      throw new NotFoundError('Parent folder not found');
    }
  }

  // Build full path
  const fullPath = buildFullPath(parentPath, data.name);

  // Check for duplicate path
  const existingFile = await File.findOne({
    projectId: new Types.ObjectId(projectId),
    path: fullPath,
  }).exec();

  if (existingFile) {
    throw new AppError('A file or folder with this path already exists', 409);
  }

  // Check file count limit
  const fileCount = await File.countDocuments({
    projectId: new Types.ObjectId(projectId),
  }).exec();

  if (fileCount >= MAX_FILES_PER_PROJECT) {
    throw new AppError(`Maximum file limit (${MAX_FILES_PER_PROJECT}) reached`, 400);
  }

  // Check nesting depth for folders
  if (data.type === 'folder') {
    const depth = fullPath.split('/').filter((s) => s.length > 0).length;
    if (depth > MAX_NESTING_DEPTH) {
      throw new AppError(`Maximum nesting depth (${MAX_NESTING_DEPTH}) exceeded`, 400);
    }
  }

  // Create file/folder
  const file = new File({
    projectId: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
    name: data.name,
    path: fullPath,
    type: data.type,
    language: data.language,
    content: data.type === 'folder' ? '' : data.content || '',
  });

  await file.save();

  logger.info('File created', {
    fileId: file._id,
    projectId,
    path: file.path,
    type: file.type,
  });

  return file;
}

/**
 * List files in a project with optional filtering.
 */
export async function listFiles(
  projectId: string,
  ownerId: string,
  query: ListFilesQueryInput,
): Promise<IFile[]> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  const { path, type, recursive } = query;
  const normalizedPath = normalizePath(path);

  // Build filter
  const filter: Record<string, unknown> = {
    projectId: new Types.ObjectId(projectId),
  };

  if (type) {
    filter.type = type;
  }

  if (recursive) {
    // Include all descendants
    if (normalizedPath) {
      filter.path = { $regex: `^${normalizedPath}(/|$)` };
    }
  } else {
    // Only direct children
    if (normalizedPath) {
      filter.path = { $regex: `^${normalizedPath}/[^/]+$` };
    } else {
      // Root level files/folders
      filter.path = { $regex: '^[^/]+$' };
    }
  }

  const files = await File.find(filter).sort({ type: 1, name: 1 }).exec();

  return files;
}

/**
 * Get a single file by ID with ownership verification.
 */
export async function getFileById(
  projectId: string,
  fileId: string,
  ownerId: string,
): Promise<IFile> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Validate ObjectId
  if (!Types.ObjectId.isValid(fileId)) {
    throw new NotFoundError('File not found');
  }

  const file = await File.findOne({
    _id: new Types.ObjectId(fileId),
    projectId: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!file) {
    throw new NotFoundError('File not found');
  }

  return file;
}

/**
 * Update file content with optimistic concurrency control.
 */
export async function updateFile(
  projectId: string,
  fileId: string,
  ownerId: string,
  data: UpdateFileInput,
): Promise<IFile> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Validate ObjectId
  if (!Types.ObjectId.isValid(fileId)) {
    throw new NotFoundError('File not found');
  }

  // Find the file
  const file = await File.findOne({
    _id: new Types.ObjectId(fileId),
    projectId: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!file) {
    throw new NotFoundError('File not found');
  }

  // Check version for optimistic concurrency
  if (file.version !== data.version) {
    throw new AppError(
      `Version conflict: expected version ${data.version}, but current version is ${file.version}`,
      409,
    );
  }

  // Prevent updating folder content
  if (file.type === 'folder' && data.content !== undefined) {
    throw new AppError('Cannot set content on a folder', 400);
  }

  // Update file
  if (data.content !== undefined) {
    file.content = data.content;
  }
  if (data.language !== undefined) {
    file.language = data.language;
  }
  file.version += 1;

  await file.save();

  logger.info('File updated', {
    fileId: file._id,
    projectId,
    newVersion: file.version,
  });

  return file;
}

/**
 * Rename a file or folder (and update descendant paths for folders).
 */
export async function renameFile(
  projectId: string,
  fileId: string,
  ownerId: string,
  newName: string,
): Promise<IFile> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Validate ObjectId
  if (!Types.ObjectId.isValid(fileId)) {
    throw new NotFoundError('File not found');
  }

  // Find the file
  const file = await File.findOne({
    _id: new Types.ObjectId(fileId),
    projectId: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!file) {
    throw new NotFoundError('File not found');
  }

  // Build new path
  const parentPath = getParentPath(file.path);
  const newPath = buildFullPath(parentPath, newName);

  // Check for duplicate path
  const existingFile = await File.findOne({
    projectId: new Types.ObjectId(projectId),
    path: newPath,
    _id: { $ne: file._id },
  }).exec();

  if (existingFile) {
    throw new AppError('A file or folder with this name already exists in this location', 409);
  }

  // If it's a folder, update all descendant paths
  if (file.type === 'folder') {
    const oldPath = file.path;

    // Find all descendants
    const descendants = await File.find({
      projectId: new Types.ObjectId(projectId),
      path: { $regex: `^${oldPath}/` },
    }).exec();

    // Update each descendant's path
    for (const descendant of descendants) {
      const relativePath = descendant.path.substring(oldPath.length);
      descendant.path = newPath + relativePath;
      await descendant.save();
    }

    logger.info('Folder renamed with descendants', {
      fileId: file._id,
      projectId,
      oldPath,
      newPath,
      descendantsUpdated: descendants.length,
    });
  }

  // Update the file/folder itself
  file.name = newName;
  file.path = newPath;
  await file.save();

  logger.info('File renamed', {
    fileId: file._id,
    projectId,
    newName,
  });

  return file;
}

/**
 * Delete a file or folder (and descendants for folders).
 */
export async function deleteFile(
  projectId: string,
  fileId: string,
  ownerId: string,
): Promise<void> {
  // Verify project ownership
  await verifyProjectOwnership(projectId, ownerId);

  // Validate ObjectId
  if (!Types.ObjectId.isValid(fileId)) {
    throw new NotFoundError('File not found');
  }

  // Find the file
  const file = await File.findOne({
    _id: new Types.ObjectId(fileId),
    projectId: new Types.ObjectId(projectId),
    ownerId: new Types.ObjectId(ownerId),
  }).exec();

  if (!file) {
    throw new NotFoundError('File not found');
  }

  // If it's a folder, delete all descendants
  if (file.type === 'folder') {
    const result = await File.deleteMany({
      projectId: new Types.ObjectId(projectId),
      path: { $regex: `^${file.path}(/|$)` },
    }).exec();

    logger.info('Folder deleted with descendants', {
      fileId: file._id,
      projectId,
      path: file.path,
      filesDeleted: result.deletedCount,
    });
  } else {
    // Delete single file
    await File.deleteOne({
      _id: file._id,
    }).exec();

    logger.info('File deleted', {
      fileId: file._id,
      projectId,
      path: file.path,
    });
  }
}

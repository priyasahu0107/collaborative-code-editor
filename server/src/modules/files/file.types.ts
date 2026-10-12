/**
 * File module type definitions.
 */

import type { FileEntryType } from '../../models/File.model.js';

/**
 * File/folder creation request body.
 */
export interface CreateFileRequest {
  name: string;
  path?: string; // Parent folder path (optional, defaults to root)
  type: FileEntryType;
  language?: string;
  content?: string;
}

/**
 * File update request body.
 */
export interface UpdateFileRequest {
  content?: string;
  language?: string;
  version: number; // Required for optimistic concurrency
}

/**
 * File rename request body.
 */
export interface RenameFileRequest {
  newName: string;
}

/**
 * File list query parameters.
 */
export interface ListFilesQuery {
  path?: string; // Filter by parent folder path
  type?: FileEntryType; // Filter by type
  recursive?: boolean; // Include descendants
}

/**
 * File tree node for tree representation.
 */
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: FileEntryType;
  language?: string;
  version: number;
  children?: FileTreeNode[];
  createdAt: string;
  updatedAt: string;
}

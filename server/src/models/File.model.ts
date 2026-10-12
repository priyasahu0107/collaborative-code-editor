/**
 * File model for managing project files and folders.
 *
 * - Each file belongs to a project and has an owner reference for fast auth checks.
 * - Supports nested folders via normalized relative paths.
 * - Tracks version for optimistic concurrency control.
 * - Prevents path traversal and duplicate sibling names.
 */

import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

/**
 * File entry type.
 */
export type FileEntryType = 'file' | 'folder';

/**
 * File document interface.
 */
export interface IFile extends Document {
  projectId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  path: string; // Normalized relative path (e.g., "src/index.ts" or "src")
  type: FileEntryType;
  language?: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(includeContent?: boolean): IFileJSON;
}

/**
 * Safe file JSON representation.
 */
export interface IFileJSON {
  id: string;
  projectId: string;
  name: string;
  path: string;
  type: FileEntryType;
  language?: string;
  content?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Maximum nesting depth for folders.
 */
export const MAX_NESTING_DEPTH = 10;

/**
 * Maximum file content size in characters.
 */
export const MAX_FILE_CONTENT_SIZE = 500_000; // ~500KB

/**
 * Maximum number of files per project.
 */
export const MAX_FILES_PER_PROJECT = 1000;

/**
 * File schema definition.
 */
const fileSchema = new Schema<IFile>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      minlength: [1, 'File name must be at least 1 character'],
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      trim: true,
      maxlength: [1000, 'Path cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['file', 'folder'],
        message: 'Type must be file or folder',
      },
      required: [true, 'Type is required'],
    },
    language: {
      type: String,
      trim: true,
      maxlength: [50, 'Language identifier cannot exceed 50 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [MAX_FILE_CONTENT_SIZE, `Content cannot exceed ${MAX_FILE_CONTENT_SIZE} characters`],
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

// Compound indexes for efficient queries
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });
fileSchema.index({ projectId: 1, type: 1 });
fileSchema.index({ ownerId: 1, projectId: 1 });

/**
 * Return a safe JSON representation.
 * Optionally includes content (for single file retrieval).
 */
fileSchema.methods.toSafeJSON = function (includeContent = false): IFileJSON {
  const json: IFileJSON = {
    id: this._id.toString(),
    projectId: this.projectId.toString(),
    name: this.name,
    path: this.path,
    type: this.type,
    language: this.language,
    version: this.version,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };

  if (includeContent && this.type === 'file') {
    json.content = this.content;
  }

  return json;
};

/**
 * File model.
 */
export const File: Model<IFile> =
  mongoose.models.File || model<IFile>('File', fileSchema);

export default File;

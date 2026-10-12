/**
 * Project model for managing collaborative coding projects.
 *
 * - Each project belongs to an owner (authenticated user).
 * - Projects have metadata like name, description, default language.
 * - Visibility is private by default (collaboration not yet implemented).
 * - File count is maintained for quick access.
 */

import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

/**
 * Project visibility options.
 */
export type ProjectVisibility = 'private' | 'public';

/**
 * Project document interface.
 */
export interface IProject extends Document {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  visibility: ProjectVisibility;
  defaultLanguage: string;
  fileCount: number;
  lastOpenedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(): IProjectJSON;
}

/**
 * Safe project JSON representation.
 */
export interface IProjectJSON {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility: ProjectVisibility;
  defaultLanguage: string;
  fileCount: number;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project schema definition.
 */
const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [1, 'Project name must be at least 1 character'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    visibility: {
      type: String,
      enum: {
        values: ['private', 'public'],
        message: 'Visibility must be private or public',
      },
      default: 'private',
    },
    defaultLanguage: {
      type: String,
      trim: true,
      default: 'javascript',
      maxlength: [50, 'Language identifier cannot exceed 50 characters'],
    },
    fileCount: {
      type: Number,
      default: 0,
      min: [0, 'File count cannot be negative'],
    },
    lastOpenedAt: {
      type: Date,
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

// Compound index for efficient queries
projectSchema.index({ ownerId: 1, createdAt: -1 });
projectSchema.index({ ownerId: 1, name: 1 });

/**
 * Return a safe JSON representation.
 */
projectSchema.methods.toSafeJSON = function (): IProjectJSON {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    ownerId: this.ownerId.toString(),
    visibility: this.visibility,
    defaultLanguage: this.defaultLanguage,
    fileCount: this.fileCount,
    lastOpenedAt: this.lastOpenedAt?.toISOString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

/**
 * Project model.
 */
export const Project: Model<IProject> =
  mongoose.models.Project || model<IProject>('Project', projectSchema);

export default Project;

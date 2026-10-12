/**
 * ProjectMember model for managing project collaboration permissions.
 *
 * - Tracks which users have access to which projects.
 * - Supports role-based access control (owner, editor, viewer).
 * - Separate from Project model for better separation of concerns.
 */

import { Schema, model, models, type Document, type Model, Types } from 'mongoose';

/**
 * Member role types.
 */
export type MemberRole = 'owner' | 'editor' | 'viewer';

/**
 * ProjectMember document interface.
 */
export interface IProjectMember extends Document {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(): IProjectMemberJSON;
}

/**
 * Safe project member JSON representation.
 */
export interface IProjectMemberJSON {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ProjectMember schema definition.
 */
const projectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['owner', 'editor', 'viewer'],
        message: 'Role must be owner, editor, or viewer',
      },
      required: [true, 'Role is required'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
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
  }
);

// Compound index to ensure unique project/user combinations
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

// Index for efficient queries by user
projectMemberSchema.index({ userId: 1 });

/**
 * Return a safe JSON representation.
 */
projectMemberSchema.methods.toSafeJSON = function (): IProjectMemberJSON {
  return {
    id: this._id.toString(),
    projectId: this.projectId.toString(),
    userId: this.userId.toString(),
    role: this.role,
    joinedAt: this.joinedAt.toISOString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

/**
 * ProjectMember model.
 */
export const ProjectMember: Model<IProjectMember> =
  models.ProjectMember || model<IProjectMember>('ProjectMember', projectMemberSchema);

export default ProjectMember;

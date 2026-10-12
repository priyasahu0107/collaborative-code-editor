/**
 * Invitation model for managing project collaboration invitations.
 *
 * - Stores invitation tokens as cryptographic hashes (never plaintext).
 * - Supports expiration and status tracking.
 * - Prevents reuse of accepted/revoked/expired invitations.
 */

import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import type { MemberRole } from './ProjectMember.model.js';

/**
 * Invitation status types.
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

/**
 * Invitation document interface.
 */
export interface IInvitation extends Document {
  projectId: Types.ObjectId;
  inviterId: Types.ObjectId;
  inviteeEmail: string;
  tokenHash: string;
  role: MemberRole;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(): IInvitationJSON;
}

/**
 * Safe invitation JSON representation (excludes token hash).
 */
export interface IInvitationJSON {
  id: string;
  projectId: string;
  inviterId: string;
  inviteeEmail: string;
  role: MemberRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Invitation schema definition.
 */
const invitationSchema = new Schema<IInvitation>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    inviterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter ID is required'],
    },
    inviteeEmail: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['editor', 'viewer'],
        message: 'Invitation role must be editor or viewer',
      },
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'declined', 'revoked', 'expired'],
        message: 'Invalid invitation status',
      },
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
    acceptedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        delete ret.tokenHash; // Never expose token hash in JSON
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Compound index for efficient queries
invitationSchema.index({ projectId: 1, status: 1 });
invitationSchema.index({ inviteeEmail: 1, status: 1 });

/**
 * Return a safe JSON representation (excludes token hash).
 */
invitationSchema.methods.toSafeJSON = function (): IInvitationJSON {
  return {
    id: this._id.toString(),
    projectId: this.projectId.toString(),
    inviterId: this.inviterId.toString(),
    inviteeEmail: this.inviteeEmail,
    role: this.role,
    status: this.status,
    expiresAt: this.expiresAt.toISOString(),
    acceptedAt: this.acceptedAt?.toISOString(),
    revokedAt: this.revokedAt?.toISOString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

/**
 * Invitation model.
 */
export const Invitation: Model<IInvitation> =
  mongoose.models.Invitation || model<IInvitation>('Invitation', invitationSchema);

export default Invitation;

/**
 * Message model for project chat functionality.
 *
 * - Stores chat messages for projects.
 * - Links messages to sender and project.
 * - Supports pagination and chronological retrieval.
 */

import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

/**
 * Message document interface.
 */
export interface IMessage extends Document {
  projectId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  toSafeJSON(): IMessageJSON;
}

/**
 * Safe message JSON representation.
 */
export interface IMessageJSON {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message schema definition.
 */
const messageSchema = new Schema<IMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message content cannot be empty'],
      maxlength: [2000, 'Message content cannot exceed 2000 characters'],
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

// Compound index for efficient pagination by project and time
messageSchema.index({ projectId: 1, createdAt: -1 });

/**
 * Return a safe JSON representation.
 */
messageSchema.methods.toSafeJSON = function (): IMessageJSON {
  return {
    id: this._id.toString(),
    projectId: this.projectId.toString(),
    senderId: this.senderId.toString(),
    content: this.content,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

/**
 * Message model.
 */
export const Message: Model<IMessage> =
  mongoose.models.Message || model<IMessage>('Message', messageSchema);

export default Message;

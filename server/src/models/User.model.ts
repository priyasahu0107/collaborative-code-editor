/**
 * User model for authentication and user management.
 *
 * - Normalized email (lowercase, trimmed).
 * - Password hashed with bcrypt before saving.
 * - Password hash excluded from JSON serialization.
 * - Unique indexes on email.
 */

import { Schema, model, models, type Document, type Model } from 'mongoose';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * User document interface.
 */
export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeJSON(): Omit<IUserJSON, 'passwordHash'>;
}

/**
 * Safe user JSON representation (no password hash).
 */
export interface IUserJSON {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User schema definition.
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: 60, // bcrypt hash is always 60 chars
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Avatar URL cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Remove passwordHash from JSON output
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

/**
 * Pre-save hook: Hash password before saving.
 */
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Password hashing failed'));
  }
});

/**
 * Compare a candidate password with the stored hash.
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Return a safe JSON representation without sensitive fields.
 */
userSchema.methods.toSafeJSON = function (): Omit<IUserJSON, 'passwordHash'> {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatarUrl: this.avatarUrl,
    isActive: this.isActive,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

/**
 * User model.
 */
export const User: Model<IUser> =
  models.User || model<IUser>('User', userSchema);

export default User;

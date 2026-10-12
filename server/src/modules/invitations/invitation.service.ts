/**
 * Invitation service for managing project invitations.
 *
 * - Creates invitations with secure tokens.
 * - Handles invitation acceptance and revocation.
 * - Enforces ownership and permission checks.
 */

import crypto from 'crypto';
import { Types } from 'mongoose';
import Invitation from '../../models/Invitation.model.js';
import Project from '../../models/Project.model.js';
import ProjectMember from '../../models/ProjectMember.model.js';
import User from '../../models/User.model.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Generate a secure invitation token.
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash an invitation token using SHA-256.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new invitation.
 */
export async function createInvitation(
  projectId: string,
  inviterId: string,
  inviteeEmail: string,
  role: 'editor' | 'viewer'
): Promise<{ invitation: any; token: string }> {
  // Validate project exists and user is owner
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  if (project.ownerId.toString() !== inviterId) {
    throw new AppError('Only project owners can create invitations', 403);
  }

  // Validate invitee email
  const invitee = await User.findOne({ email: inviteeEmail.toLowerCase() });
  if (!invitee) {
    throw new AppError('Invitee must be a registered user', 400);
  }

  // Check if user is already a member
  const existingMember = await ProjectMember.findOne({
    projectId: new Types.ObjectId(projectId),
    userId: invitee._id,
  });

  if (existingMember) {
    throw new AppError('User is already a project member', 400);
  }

  // Check for existing pending invitation
  const existingInvitation = await Invitation.findOne({
    projectId: new Types.ObjectId(projectId),
    inviteeEmail: inviteeEmail.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  if (existingInvitation) {
    throw new AppError('A pending invitation already exists for this user', 400);
  }

  // Generate token and hash
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Set expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create invitation
  const invitation = new Invitation({
    projectId: new Types.ObjectId(projectId),
    inviterId: new Types.ObjectId(inviterId),
    inviteeEmail: inviteeEmail.toLowerCase(),
    tokenHash,
    role,
    status: 'pending',
    expiresAt,
  });

  await invitation.save();

  logger.info('Invitation created', {
    invitationId: invitation._id,
    projectId,
    inviterId,
    inviteeEmail,
    role,
  });

  // Return invitation and raw token (token is only returned once)
  return {
    invitation: invitation.toSafeJSON(),
    token,
  };
}

/**
 * Accept an invitation.
 */
export async function acceptInvitation(
  invitationId: string,
  token: string,
  userId: string
): Promise<any> {
  // Find invitation
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // Verify token
  const tokenHash = hashToken(token);
  if (invitation.tokenHash !== tokenHash) {
    throw new AppError('Invalid invitation token', 403);
  }

  // Check status
  if (invitation.status !== 'pending') {
    throw new AppError(`Invitation is ${invitation.status}`, 400);
  }

  // Check expiration
  if (invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new AppError('Invitation has expired', 400);
  }

  // Verify user email matches invitee email
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
    throw new AppError('This invitation is not for your account', 403);
  }

  // Check if already a member (race condition protection)
  const existingMember = await ProjectMember.findOne({
    projectId: invitation.projectId,
    userId: new Types.ObjectId(userId),
  });

  if (existingMember) {
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();
    throw new AppError('You are already a member of this project', 400);
  }

  // Create membership
  const member = new ProjectMember({
    projectId: invitation.projectId,
    userId: new Types.ObjectId(userId),
    role: invitation.role,
    joinedAt: new Date(),
  });

  await member.save();

  // Update invitation status
  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  await invitation.save();

  logger.info('Invitation accepted', {
    invitationId: invitation._id,
    projectId: invitation.projectId,
    userId,
    role: invitation.role,
  });

  return member.toSafeJSON();
}

/**
 * Decline an invitation.
 */
export async function declineInvitation(
  invitationId: string,
  token: string,
  userId: string
): Promise<void> {
  // Find invitation
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // Verify token
  const tokenHash = hashToken(token);
  if (invitation.tokenHash !== tokenHash) {
    throw new AppError('Invalid invitation token', 403);
  }

  // Check status
  if (invitation.status !== 'pending') {
    throw new AppError(`Invitation is ${invitation.status}`, 400);
  }

  // Verify user email matches invitee email
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
    throw new AppError('This invitation is not for your account', 403);
  }

  // Update invitation status
  invitation.status = 'declined';
  await invitation.save();

  logger.info('Invitation declined', {
    invitationId: invitation._id,
    projectId: invitation.projectId,
    userId,
  });
}

/**
 * Revoke an invitation (owner only).
 */
export async function revokeInvitation(
  invitationId: string,
  userId: string
): Promise<void> {
  // Find invitation
  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // Verify user is project owner
  const project = await Project.findById(invitation.projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  if (project.ownerId.toString() !== userId) {
    throw new AppError('Only project owners can revoke invitations', 403);
  }

  // Check status
  if (invitation.status !== 'pending') {
    throw new AppError(`Cannot revoke ${invitation.status} invitation`, 400);
  }

  // Update invitation status
  invitation.status = 'revoked';
  invitation.revokedAt = new Date();
  await invitation.save();

  logger.info('Invitation revoked', {
    invitationId: invitation._id,
    projectId: invitation.projectId,
    userId,
  });
}

/**
 * List invitations for a project (owner only).
 */
export async function listInvitations(
  projectId: string,
  userId: string
): Promise<any[]> {
  // Verify user is project owner
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  if (project.ownerId.toString() !== userId) {
    throw new AppError('Only project owners can view invitations', 403);
  }

  const invitations = await Invitation.find({
    projectId: new Types.ObjectId(projectId),
  })
    .sort({ createdAt: -1 })
    .exec();

  return invitations.map((inv) => inv.toSafeJSON());
}

/**
 * List pending invitations for a user.
 */
export async function listPendingInvitations(userId: string): Promise<any[]> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const invitations = await Invitation.find({
    inviteeEmail: user.email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('projectId', 'name')
    .populate('inviterId', 'name email')
    .sort({ createdAt: -1 })
    .exec();

  return invitations.map((inv) => ({
    ...inv.toSafeJSON(),
    project: inv.projectId,
    inviter: inv.inviterId,
  }));
}

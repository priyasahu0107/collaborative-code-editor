/**
 * Membership service for managing project members.
 *
 * - Lists project members.
 * - Updates member roles.
 * - Removes members from projects.
 * - Enforces ownership and permission checks.
 */

import { Types } from 'mongoose';
import ProjectMember from '../../models/ProjectMember.model.js';
import Project from '../../models/Project.model.js';
import User from '../../models/User.model.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * List members for a project.
 */
export async function listMembers(
  projectId: string,
  userId: string
): Promise<any[]> {
  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Verify user is owner or member
  const isOwner = project.ownerId.toString() === userId;
  const isMember = await ProjectMember.exists({
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  });

  if (!isOwner && !isMember) {
    throw new AppError('Access denied', 403);
  }

  // Get all members
  const members = await ProjectMember.find({
    projectId: new Types.ObjectId(projectId),
  })
    .populate('userId', 'name email')
    .sort({ joinedAt: 1 })
    .exec();

  // Include owner in the list
  const owner = await User.findById(project.ownerId).select('name email');
  
  const memberList = [
    {
      id: 'owner',
      projectId: project._id.toString(),
      userId: project.ownerId.toString(),
      role: 'owner',
      user: owner,
      joinedAt: project.createdAt.toISOString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    ...members.map((m) => ({
      ...m.toSafeJSON(),
      user: m.userId,
    })),
  ];

  return memberList;
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  newRole: 'editor' | 'viewer',
  userId: string
): Promise<any> {
  // Verify project exists and user is owner
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  if (project.ownerId.toString() !== userId) {
    throw new AppError('Only project owners can update member roles', 403);
  }

  // Find member
  const member = await ProjectMember.findById(memberId);
  if (!member) {
    throw new AppError('Member not found', 404);
  }

  // Verify member belongs to project
  if (member.projectId.toString() !== projectId) {
    throw new AppError('Member does not belong to this project', 400);
  }

  // Prevent role change to owner
  if (newRole === 'owner') {
    throw new AppError('Cannot assign owner role', 400);
  }

  // Update role
  member.role = newRole;
  await member.save();

  logger.info('Member role updated', {
    memberId: member._id,
    projectId,
    userId,
    newRole,
  });

  return member.toSafeJSON();
}

/**
 * Remove a member from a project.
 */
export async function removeMember(
  projectId: string,
  memberId: string,
  userId: string
): Promise<void> {
  // Verify project exists and user is owner
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404);
  }

  if (project.ownerId.toString() !== userId) {
    throw new AppError('Only project owners can remove members', 403);
  }

  // Find member
  const member = await ProjectMember.findById(memberId);
  if (!member) {
    throw new AppError('Member not found', 404);
  }

  // Verify member belongs to project
  if (member.projectId.toString() !== projectId) {
    throw new AppError('Member does not belong to this project', 400);
  }

  // Prevent owner from removing themselves (they're not in ProjectMember table)
  // This is just a safety check
  if (member.userId.toString() === userId) {
    throw new AppError('Cannot remove yourself from the project', 400);
  }

  // Remove member
  await ProjectMember.findByIdAndDelete(memberId);

  logger.info('Member removed', {
    memberId: member._id,
    projectId,
    userId,
  });
}

/**
 * Check if a user has access to a project.
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; role: string | null }> {
  const project = await Project.findById(projectId);
  if (!project) {
    return { hasAccess: false, role: null };
  }

  // Check if user is owner
  if (project.ownerId.toString() === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  // Check if user is a member
  const member = await ProjectMember.findOne({
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  });

  if (member) {
    return { hasAccess: true, role: member.role };
  }

  return { hasAccess: false, role: null };
}

/**
 * Get user's role in a project.
 */
export async function getUserRole(
  projectId: string,
  userId: string
): Promise<string | null> {
  const { role } = await checkProjectAccess(projectId, userId);
  return role;
}

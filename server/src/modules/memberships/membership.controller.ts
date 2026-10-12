/**
 * Membership controller for handling HTTP requests.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as membershipService from './membership.service.js';
import { ValidationError } from '../../middleware/errorHandler.js';

/**
 * Validation schemas.
 */
const updateRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

/**
 * GET /api/v1/projects/:projectId/members
 * List members for a project.
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const members = await membershipService.listMembers(projectId, userId);

    res.json({
      success: true,
      message: 'Members retrieved successfully',
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/projects/:projectId/members/:memberId
 * Update a member's role.
 */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // Validate request body
    const validation = updateRoleSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid role data', validation.error.errors);
    }

    const { role } = validation.data;

    const member = await membershipService.updateMemberRole(
      projectId,
      memberId,
      role,
      userId
    );

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/projects/:projectId/members/:memberId
 * Remove a member from a project.
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    await membershipService.removeMember(projectId, memberId, userId);

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
}

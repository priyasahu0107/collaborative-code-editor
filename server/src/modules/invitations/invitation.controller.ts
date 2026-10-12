/**
 * Invitation controller for handling HTTP requests.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as invitationService from './invitation.service.js';
import { ValidationError } from '../../middleware/errorHandler.js';

/**
 * Validation schemas.
 */
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/v1/projects/:projectId/invitations
 * Create a new invitation.
 */
export async function createInvitation(
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

    // Validate request body
    const validation = createInvitationSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid invitation data', validation.error.errors);
    }

    const { email, role } = validation.data;

    const result = await invitationService.createInvitation(
      projectId,
      userId,
      email,
      role
    );

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: {
        invitation: result.invitation,
        // Only return token once for sharing with invitee
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/projects/:projectId/invitations
 * List invitations for a project.
 */
export async function listInvitations(
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

    const invitations = await invitationService.listInvitations(projectId, userId);

    res.json({
      success: true,
      message: 'Invitations retrieved successfully',
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/invitations/pending
 * List pending invitations for the current user.
 */
export async function listPendingInvitations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const invitations = await invitationService.listPendingInvitations(userId);

    res.json({
      success: true,
      message: 'Pending invitations retrieved successfully',
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/invitations/:invitationId/accept
 * Accept an invitation.
 */
export async function acceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    // Validate request body
    const validation = acceptInvitationSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid acceptance data', validation.error.errors);
    }

    const { token } = validation.data;

    const member = await invitationService.acceptInvitation(invitationId, token, userId);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/invitations/:invitationId/decline
 * Decline an invitation.
 */
export async function declineInvitation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Token is required');
    }

    await invitationService.declineInvitation(invitationId, token, userId);

    res.json({
      success: true,
      message: 'Invitation declined successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/invitations/:invitationId/revoke
 * Revoke an invitation (owner only).
 */
export async function revokeInvitation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    await invitationService.revokeInvitation(invitationId, userId);

    res.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    next(error);
  }
}

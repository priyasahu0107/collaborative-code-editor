/**
 * Invitation routes.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as invitationController from './invitation.controller.js';

const router = Router();

// All invitation routes require authentication
router.use(authenticate);

// Project-specific invitation routes
router.post('/projects/:projectId/invitations', invitationController.createInvitation);
router.get('/projects/:projectId/invitations', invitationController.listInvitations);

// User-specific invitation routes
router.get('/invitations/pending', invitationController.listPendingInvitations);
router.post('/invitations/:invitationId/accept', invitationController.acceptInvitation);
router.post('/invitations/:invitationId/decline', invitationController.declineInvitation);
router.post('/invitations/:invitationId/revoke', invitationController.revokeInvitation);

export default router;

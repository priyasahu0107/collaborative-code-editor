/**
 * Membership routes.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as membershipController from './membership.controller.js';

const router = Router();

// All membership routes require authentication
router.use(authenticate);

// Project member management routes
router.get('/projects/:projectId/members', membershipController.listMembers);
router.patch('/projects/:projectId/members/:memberId', membershipController.updateMemberRole);
router.delete('/projects/:projectId/members/:memberId', membershipController.removeMember);

export default router;

/**
 * Project routes - REST API endpoints for project management.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createProjectHandler,
  listProjectsHandler,
  getProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from './project.controller.js';
import fileRoutes from '../files/file.routes.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', createProjectHandler);
router.get('/', listProjectsHandler);
router.get('/:projectId', getProjectHandler);
router.patch('/:projectId', updateProjectHandler);
router.delete('/:projectId', deleteProjectHandler);

// Mount file routes under /:projectId/files
router.use('/:projectId/files', fileRoutes);

export default router;

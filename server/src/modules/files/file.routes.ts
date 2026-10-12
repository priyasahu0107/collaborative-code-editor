/**
 * File routes - REST API endpoints for file management.
 */

import { Router } from 'express';
import {
  createFileHandler,
  listFilesHandler,
  getFileHandler,
  updateFileHandler,
  renameFileHandler,
  deleteFileHandler,
} from './file.controller.js';

const router = Router({ mergeParams: true }); // Enable access to :projectId

// File CRUD
router.post('/', createFileHandler);
router.get('/', listFilesHandler);
router.get('/:fileId', getFileHandler);
router.patch('/:fileId', updateFileHandler);
router.patch('/:fileId/rename', renameFileHandler);
router.delete('/:fileId', deleteFileHandler);

export default router;

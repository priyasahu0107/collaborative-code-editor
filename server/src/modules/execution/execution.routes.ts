/**
 * Execution routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { 
  executeCodeHandler, 
  getLanguagesHandler, 
  healthCheckHandler 
} from './execution.controller.js';

const router = Router();

// All execution routes require authentication
router.use(authenticate);

// Get supported languages
router.get('/languages', getLanguagesHandler);

// Check execution service health
router.get('/health', healthCheckHandler);

// Execute code
router.post('/execute', executeCodeHandler);

export default router;

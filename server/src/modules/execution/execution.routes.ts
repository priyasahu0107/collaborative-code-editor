/**
 * Execution routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { executionRateLimiter } from '../../middleware/rateLimiter.js';
import { 
  executeCodeHandler, 
  getLanguagesHandler, 
  healthCheckHandler 
} from './execution.controller.js';

const router = Router();

// All execution routes require authentication
router.use(authenticate);

// Get supported languages (no rate limit needed for this read-only endpoint)
router.get('/languages', getLanguagesHandler);

// Check execution service health (no rate limit needed for this read-only endpoint)
router.get('/health', healthCheckHandler);

// Execute code - apply strict rate limiting
router.post('/execute', executionRateLimiter, executeCodeHandler);

export default router;

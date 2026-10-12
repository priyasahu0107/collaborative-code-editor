/**
 * Health check route definitions.
 *
 * Mounts health endpoints under /api/v1/health.
 */

import { Router } from 'express';
import { getHealth, getLiveness, getReadiness } from '../controllers/health.controller.js';

const router = Router();

// GET /api/v1/health — General health status
router.get('/', getHealth);

// GET /api/v1/health/live — Liveness probe
router.get('/live', getLiveness);

// GET /api/v1/health/ready — Readiness probe
router.get('/ready', getReadiness);

export default router;

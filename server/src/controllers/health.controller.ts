/**
 * Health check controller.
 *
 * Provides three endpoints:
 * - GET /api/v1/health — General service status
 * - GET /api/v1/health/live — Liveness probe (process is alive)
 * - GET /api/v1/health/ready — Readiness probe (database connected)
 *
 * Never exposes credentials, database URIs, or stack traces.
 */

import type { Request, Response } from 'express';
import { getDatabaseState, getDatabaseStatus } from '../config/database.js';
import { getEnv } from '../config/env.js';

const SERVICE_NAME = 'collaborative-code-editor-api';
const SERVICE_VERSION = '0.2.0';

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * GET /api/v1/health
 *
 * Returns general application status.
 * Does not depend on database connectivity.
 */
export function getHealth(_req: Request, res: Response): void {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    success: true,
    message: 'Service is running',
    data: {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
    },
  });
}

/**
 * GET /api/v1/health/live
 *
 * Liveness probe — confirms the application process is alive.
 * Always returns 200 if the process is running.
 * Does NOT check database connectivity.
 */
export function getLiveness(_req: Request, res: Response): void {
  res.json({
    success: true,
    message: 'Service is alive',
    data: {
      service: SERVICE_NAME,
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * GET /api/v1/health/ready
 *
 * Readiness probe — confirms the application is ready to serve requests.
 * Checks database connectivity status.
 *
 * Returns:
 * - 200 if all dependencies are ready
 * - 503 if any dependency is not ready (e.g., database disconnected)
 *
 * Does NOT expose database URIs, credentials, or internal hostnames.
 */
export function getReadiness(_req: Request, res: Response): void {
  const dbState = getDatabaseState();
  const dbStatus = getDatabaseStatus();
  const env = getEnv();

  // Determine overall readiness
  const isDbReady = dbStatus === 'connected' || dbStatus === 'disabled';

  const readinessData = {
    service: SERVICE_NAME,
    status: isDbReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        // Only include safe diagnostic info — never the URI
        ...(dbState.error ? { message: dbState.error } : {}),
      },
      environment: env.NODE_ENV,
    },
  };

  if (isDbReady) {
    res.json({
      success: true,
      message: 'Service is ready',
      data: readinessData,
    });
  } else {
    res.status(503).json({
      success: false,
      message: 'Service is not ready',
      data: readinessData,
    });
  }
}

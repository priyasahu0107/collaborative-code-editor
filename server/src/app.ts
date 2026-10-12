/**
 * Express application setup.
 *
 * Configures middleware, routes, and error handling.
 * Does NOT bind to a port — that's done in server.ts.
 * Exports the app for testing.
 *
 * Middleware order:
 * 1. Security (Helmet)
 * 2. CORS
 * 3. Request ID (for tracing)
 * 4. Request logging (safe — no sensitive data)
 * 5. Body parsing
 * 6. Cookie parsing
 * 7. Routes
 * 8. 404 handler
 * 9. Error handler
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { getCorsOptions } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { performanceMonitor, getPerformanceMetricsHandler } from './middleware/performanceMonitor.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import invitationRoutes from './modules/invitations/invitation.routes.js';
import membershipRoutes from './modules/memberships/membership.routes.js';
import executionRoutes from './modules/execution/execution.routes.js';
import logger from './utils/logger.js';

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// Only apply CORS if env is loaded (allows testing without full config)
try {
  app.use(cors(getCorsOptions()));
} catch {
  // Fallback for testing: allow all origins when env not loaded
  app.use(cors({ origin: true, credentials: true }));
}

// ─── Request ID ──────────────────────────────────────────────────────────────
// Generate unique request ID for tracing and debugging
app.use(requestIdMiddleware);

// ─── Performance Monitoring ──────────────────────────────────────────────────
// Track request performance metrics
app.use(performanceMonitor);

// ─── Request Logging ─────────────────────────────────────────────────────────
// Use morgan with a safe format that excludes sensitive headers and bodies
const safeMorganFormat = ':method :url :status :response-time ms - :res[content-length]';
app.use(
  morgan(safeMorganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(`HTTP ${message.trim()}`);
      },
    },
    skip: () => process.env['NODE_ENV'] === 'test',
  }),
);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ─── Cookie Parsing ──────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── API Routes ──────────────────────────────────────────────────────────────
// Versioned API prefix
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', invitationRoutes);
app.use('/api/v1', membershipRoutes);
app.use('/api/v1/execution', executionRoutes);

// API root info
app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    message: 'Collaborative Code Editor API',
     {
      version: '0.4.0',
      documentation: '/api/v1/health',
    },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;

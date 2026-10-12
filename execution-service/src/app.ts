import express from 'express';
import helmet from 'helmet';
import { validateExecutionRequest } from './validators/execution.validator.js';
import { SUPPORTED_LANGUAGES } from './types/execution.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'execution-service',
      executionEnabled: false,
      reason: 'Execution is disabled until a secure sandbox runtime is configured.',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/languages', (_req, res) => {
    res.json({
      success: true,
      data: Object.values(SUPPORTED_LANGUAGES),
    });
  });

  app.post('/execute', (req, res) => {
    try {
      validateExecutionRequest(req.body);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid execution request',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid execution request',
      });
      return;
    }

    res.status(503).json({
      success: false,
      error: 'EXECUTION_DISABLED',
      message: 'Execution is disabled until a secure sandbox runtime is configured.',
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Endpoint not found',
    });
  });

  return app;
}

export default createApp;
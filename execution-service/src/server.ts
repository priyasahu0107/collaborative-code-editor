/**
 * Execution Service Server
 * 
 * Provides secure, isolated code execution in Docker containers.
 * This service runs separately from the main API server for security isolation.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { executeCode, getActiveExecutionCount } from './executors/docker-executor.js';
import { validateExecutionRequest } from './validators/execution.validator.js';
import { SUPPORTED_LANGUAGES, EXECUTION_LIMITS } from './types/execution.js';

const app = express();
const PORT = parseInt(process.env['PORT'] || '4000', 10);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['API_SERVER_URL'] || 'http://localhost:5000',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'execution-service',
    timestamp: new Date().toISOString(),
    activeExecutions: getActiveExecutionCount(),
    maxConcurrent: EXECUTION_LIMITS.MAX_CONCURRENT_EXECUTIONS,
  });
});

/**
 * Get supported languages
 */
app.get('/languages', (_req, res) => {
  const languages = Object.values(SUPPORTED_LANGUAGES).map(lang => ({
    id: lang.id,
    name: lang.name,
    supported: lang.supported,
  }));
  
  res.json({
    success: true,
    data: languages,
  });
});

/**
 * Execute code
 */
app.post('/execute', async (req, res) => {
  try {
    // Validate request
    const validatedRequest = validateExecutionRequest(req.body);
    
    // Execute code
    const result = await executeCode(validatedRequest);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a validation error
      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid execution request',
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'EXECUTION_ERROR',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
      });
    }
  }
});

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

/**
 * Error handler
 */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Execution service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Languages: http://localhost:${PORT}/languages`);
  console.log(`⚡ Execute: POST http://localhost:${PORT}/execute`);
});

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = parseInt(process.env['PORT'] || '4000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'execution-service',
    timestamp: new Date().toISOString(),
  });
});

// Code execution endpoint (placeholder - not implemented yet)
app.post('/execute', (_req, res) => {
  res.status(501).json({
    error: 'Code execution not yet implemented',
    message: 'This endpoint will be available in a future step.',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Execution service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;

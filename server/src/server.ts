import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = parseInt(process.env['PORT'] || '5000', 10);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env['CLIENT_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
  },
});

// Socket.IO connection handler (placeholder for future implementation)
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} - ${reason}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.IO ready for connections`);
});

export { io };

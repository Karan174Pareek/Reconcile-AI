import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io connection and room joins per run_id
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join_run', (runId) => {
    socket.join(`run:${runId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined room run:${runId}`);
  });

  socket.on('leave_run', (runId) => {
    socket.leave(`run:${runId}`);
    console.log(`[Socket.io] Socket ${socket.id} left room run:${runId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Export io instance for use in controllers/services
export { io };

// Start server
async function start() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`  ReconcileAI Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  WebSocket Server active`);
      console.log(`==================================================\n`);
    });
  } catch (error) {
    console.error('[Server Startup Error]:', error);
    process.exit(1);
  }
}

start();

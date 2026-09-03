import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

import { registerSocketServer } from './sockets/runSocket.js';

function sanitizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/^['"\s]+|['"\s]+$/g, '').replace(/\/+$/, '');
}

const configuredClientUrl = sanitizeOrigin(process.env.CLIENT_URL);

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

const corsOriginHandler = (origin, callback) => {
  if (!origin) return callback(null, true);
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return callback(null, false);
    }
    const cleanOrigin = sanitizeOrigin(origin);
    if (configuredClientUrl && cleanOrigin === configuredClientUrl) {
      return callback(null, cleanOrigin);
    }
    if (!isProduction) {
      const hostname = parsed.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
        return callback(null, cleanOrigin);
      }
    }
    return callback(null, false);
  } catch {
    return callback(null, false);
  }
};

const corsOptions = {
  origin: corsOriginHandler,
  methods: ['GET', 'POST'],
  credentials: true,
};

// Socket.io initialization
const io = new Server(server, {
  cors: corsOptions,
});

registerSocketServer(io);

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
  } catch (error) {
    console.warn('[Server Startup Warning]: MongoDB unavailable; using memory fallback:', error.message);
  }

  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  ReconcileAI Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  WebSocket Server active`);
    console.log(`==================================================\n`);
  });
}

start();

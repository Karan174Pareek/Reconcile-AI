import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import runsRouter from './routes/runs.js';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reconcile-ai-server',
  });
});

// API Routes
app.use('/api/runs', runsRouter);

// Standard 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      details: null,
    },
  });
});

// Global error handler complying with standard error shape
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
      details: process.env.NODE_ENV === 'development' ? err.stack : null,
    },
  });
});

export default app;

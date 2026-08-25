import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

function sanitizeOrigin(url) {
  if (!url || typeof url !== 'string') return 'http://localhost:5173';
  return url.replace(/^['"\s]+|['"\s]+$/g, '').replace(/\/+$/, '');
}

const configuredClientUrl = sanitizeOrigin(process.env.CLIENT_URL);

const corsOriginHandler = (origin, callback) => {
  if (!origin) return callback(null, true);
  const cleanOrigin = sanitizeOrigin(origin);
  if (
    cleanOrigin === configuredClientUrl ||
    cleanOrigin.endsWith('.vercel.app') ||
    cleanOrigin.includes('localhost') ||
    cleanOrigin.includes('127.0.0.1')
  ) {
    return callback(null, cleanOrigin);
  }
  return callback(null, cleanOrigin);
};

// Middleware
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import runsRouter from './routes/runs.js';
import exceptionsRouter from './routes/exceptions.js';
import draftActionsRouter from './routes/draftActions.js';
import auditLogsRouter from './routes/auditLogs.js';
import authRouter from './routes/auth.js';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reconcile-ai-server',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/runs', runsRouter);
app.use('/api/exceptions', exceptionsRouter);
app.use('/api/draft-actions', draftActionsRouter);
app.use('/api/audit-logs', auditLogsRouter);

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

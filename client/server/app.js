import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

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
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection assurance middleware for serverless invocations
app.use(async (req, res, next) => {
  try {
    if (process.env.MONGO_URI && (req.path.startsWith('/api') || req.path.startsWith('/runs') || req.path.startsWith('/exceptions') || req.path.startsWith('/draft-actions') || req.path.startsWith('/audit-logs') || req.path.startsWith('/auth'))) {
      await connectDB();
    }
  } catch (err) {
    console.warn('[DB Middleware - Memory Fallback Active]:', err.message);
  }
  next();
});

import runsRouter from './routes/runs.js';
import exceptionsRouter from './routes/exceptions.js';
import draftActionsRouter from './routes/draftActions.js';
import auditLogsRouter from './routes/auditLogs.js';
import authRouter from './routes/auth.js';

// Root API welcome endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ReconcileAI Reconciliation Backend Engine',
    version: '2.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: {
      health: '/api/health',
      runs: '/api/runs',
      exceptions: '/api/exceptions',
      draft_actions: '/api/draft-actions',
      audit_logs: '/api/audit-logs',
      auth: '/api/auth',
    },
  });
});

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reconcile-ai-server',
  });
});

// API Routes (mounted on both /api/* and /* for universal serverless compatibility)
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);

app.use('/api/runs', runsRouter);
app.use('/runs', runsRouter);

app.use('/api/exceptions', exceptionsRouter);
app.use('/exceptions', exceptionsRouter);

app.use('/api/draft-actions', draftActionsRouter);
app.use('/draft-actions', draftActionsRouter);

app.use('/api/audit-logs', auditLogsRouter);
app.use('/audit-logs', auditLogsRouter);

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

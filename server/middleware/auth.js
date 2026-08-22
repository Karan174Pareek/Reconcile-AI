import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'reconcile-ai-dev-secret-key-98765';

/**
 * Authentication middleware verifying JWT Bearer token on protected mutating routes.
 * Supports demo bypass in development / demo mode when authorization header is absent.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Check for demo mode / demo user header in non-strict development mode
    if (!token && (process.env.NODE_ENV !== 'production' || req.headers['x-demo-user'])) {
      const demoEmail = req.headers['x-demo-user'] || 'analyst@reconcile.ai';
      req.user = {
        email: demoEmail,
        role: 'analyst',
        is_demo: true,
      };
      return next();
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
          details: null,
        },
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
        details: err.message,
      },
    });
  }
}

/**
 * Generates JWT token for a user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

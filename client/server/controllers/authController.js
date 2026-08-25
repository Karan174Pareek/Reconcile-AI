import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const memoryUsers = new Map();

/**
 * Controller: Register a new user
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { email, password, role = 'analyst' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
          details: null,
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters.',
          details: null,
        },
      });
    }

    const normalizedEmail = email.toLowerCase();
    let existingUser = null;

    if (mongoose.connection.readyState === 1) {
      try {
        existingUser = await User.findOne({ email: normalizedEmail });
      } catch (e) {
        console.warn('[Mongo Find User Warning]:', e.message);
      }
    }

    if (!existingUser) {
      existingUser = memoryUsers.get(normalizedEmail);
    }

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists.',
          details: null,
        },
      });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'analyst';
    let user = null;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.create({
          email: normalizedEmail,
          password,
          role: assignedRole,
        });
      } catch (e) {
        console.warn('[Mongo Create User Warning]:', e.message);
      }
    }

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = {
        _id: `user_${Date.now()}`,
        id: `user_${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
      };
      memoryUsers.set(normalizedEmail, user);
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Login user and issue JWT
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
          details: null,
        },
      });
    }

    const normalizedEmail = email.toLowerCase();
    let user = null;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ email: normalizedEmail });
      } catch (e) {
        console.warn('[Mongo Login Find Warning]:', e.message);
      }
    }

    if (!user) {
      user = memoryUsers.get(normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: null,
        },
      });
    }

    let isMatch = false;
    if (typeof user.comparePassword === 'function') {
      isMatch = await user.comparePassword(password);
    } else if (user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          details: null,
        },
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Get current authenticated user
 * GET /api/auth/me
 */
export async function getMe(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    let user = null;

    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          user = await User.findById(userId).select('-password');
        }
      } catch (e) {
        console.warn('[Mongo GetMe Warning]:', e.message);
      }
    }

    if (!user) {
      for (const u of memoryUsers.values()) {
        if (u._id === userId || u.id === userId) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Authenticated user not found.',
          details: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

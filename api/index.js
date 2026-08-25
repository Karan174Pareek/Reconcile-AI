import app from '../server/app.js';
import { connectDB } from '../server/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless MongoDB Connection Error]:', err.message);
    return res.status(500).json({
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: err.message || 'Failed to connect to MongoDB Atlas database',
        details: null,
      },
    });
  }

  return app(req, res);
}

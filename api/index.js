import app from '../server/app.js';
import { connectDB } from '../server/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless MongoDB Connection Error]:', err.message);
  }

  // Ensure /api prefix is present for Express route matching
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : '/' + req.url}`;
  }

  return app(req, res);
}

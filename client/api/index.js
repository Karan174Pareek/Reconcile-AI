import app from '../../server/app.js';
import { connectDB } from '../../server/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless MongoDB Connection Error]:', err.message);
  }
  return app(req, res);
}

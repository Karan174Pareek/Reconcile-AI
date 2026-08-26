// Vercel Serverless API Entrypoint (Updated 2026-08-26)
import app from '../server/app.js';

export default function handler(req, res) {
  return app(req, res);
}

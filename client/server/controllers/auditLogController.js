import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { MemoryStore } from '../services/memoryStore.js';

/**
 * Controller: Get audit trail timeline for a run
 * GET /api/runs/:run_id/audit-log
 */
export async function getRunAuditLogs(req, res, next) {
  try {
    const { run_id } = req.params;
    const { target_type, actor, limit = 100 } = req.query;

    const maxLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    let logs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query = { run_id };
        if (target_type && target_type !== 'all') query.target_type = target_type;
        if (actor && actor !== 'all') query.actor = actor;

        logs = await AuditLog.find(query)
          .sort({ timestamp: -1 })
          .limit(maxLimit)
          .lean();
      } catch (e) {
        console.warn('[Mongo AuditLog Warning]:', e.message);
      }
    }

    if (logs.length === 0) {
      logs = MemoryStore.getAuditLogs(run_id);
    }

    if (target_type && target_type !== 'all') {
      logs = logs.filter((l) => l.target_type === target_type);
    }
    if (actor && actor !== 'all') {
      logs = logs.filter((l) => l.actor === actor);
    }

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs.slice(0, maxLimit),
    });
  } catch (error) {
    next(error);
  }
}

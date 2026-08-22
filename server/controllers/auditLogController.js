import AuditLog from '../models/AuditLog.js';

/**
 * Controller: Get audit trail timeline for a run
 * GET /api/runs/:run_id/audit-log
 */
export async function getRunAuditLogs(req, res, next) {
  try {
    const { run_id } = req.params;
    const { target_type, actor, limit = 100 } = req.query;

    const query = { run_id };
    if (target_type && target_type !== 'all') query.target_type = target_type;
    if (actor && actor !== 'all') query.actor = actor;

    const maxLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(maxLimit)
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

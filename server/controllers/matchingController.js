import { executeRun } from '../services/matchingEngine.js';
import Run from '../models/Run.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';

/**
 * Controller: Executes Pass 1 and Pass 2 reconciliation for a given run_id
 * POST /api/runs/:run_id/execute
 */
export async function executeRunHandler(req, res, next) {
  try {
    const { run_id } = req.params;

    if (!run_id) {
      return res.status(400).json({
        error: {
          code: 'MISSING_RUN_ID',
          message: 'Parameter "run_id" is required.',
          details: null,
        },
      });
    }

    const result = await executeRun(run_id);

    return res.status(200).json({
      success: true,
      message: `Reconciliation executed successfully for run ${run_id}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Executes Pass 3 Claude reasoning and draft-action generation for a given run_id
 * POST /api/runs/:run_id/pass3
 */
export async function executePass3Handler(req, res, next) {
  try {
    const { run_id } = req.params;

    if (!run_id) {
      return res.status(400).json({
        error: {
          code: 'MISSING_RUN_ID',
          message: 'Parameter "run_id" is required.',
          details: null,
        },
      });
    }

    const { executePass3 } = await import('../services/claudeOrchestrator.js');
    const result = await executePass3(run_id);

    return res.status(200).json({
      success: true,
      message: `Pass 3 Claude reasoning completed for run ${run_id}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Retrieves status, metrics, matches, and exceptions for a specific run
 * GET /api/runs/:run_id
 */
export async function getRunDetails(req, res, next) {
  try {
    const { run_id } = req.params;

    const run = await Run.findOne({ run_id }).lean();
    if (!run) {
      return res.status(404).json({
        error: {
          code: 'RUN_NOT_FOUND',
          message: `Run with ID "${run_id}" not found.`,
          details: null,
        },
      });
    }

    const matchesCount = await Match.countDocuments({ run_id });
    const exceptionsCount = await Exception.countDocuments({ run_id });

    return res.status(200).json({
      success: true,
      data: {
        run,
        matches_count: matchesCount,
        exceptions_count: exceptionsCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Lists all reconciliation runs sorted by creation date descending
 * GET /api/runs
 */
export async function listRuns(req, res, next) {
  try {
    const runs = await Run.find().sort({ created_at: -1 }).limit(50).lean();
    return res.status(200).json({
      success: true,
      count: runs.length,
      data: runs,
    });
  } catch (error) {
    next(error);
  }
}

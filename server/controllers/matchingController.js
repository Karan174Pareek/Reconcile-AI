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

import {
  emitRunProgress,
  emitPassComplete,
  emitRunComplete,
  emitRunError,
} from '../sockets/runSocket.js';

/**
 * Controller: Executes full 3-pass reconciliation pipeline (Pass 1 -> Pass 2 -> Pass 3)
 * with real-time Socket.io progress streaming
 * POST /api/runs/:run_id/reconcile-all
 */
export async function reconcileAllHandler(req, res, next) {
  const { run_id } = req.params;
  try {
    if (!run_id) {
      return res.status(400).json({
        error: {
          code: 'MISSING_RUN_ID',
          message: 'Parameter "run_id" is required.',
          details: null,
        },
      });
    }

    // 1. Stage 1: Deterministic Matching (3-level settlement engine / Pass 1 & 2)
    emitRunProgress(run_id, {
      stage: 'deterministic_start',
      pass: 1,
      percentage: 10,
      message: 'Starting deterministic reconciliation engine...',
    });

    const pass1And2Result = await executeRun(run_id);

    const detStats = pass1And2Result.stats || {};
    const detMessage =
      pass1And2Result.mode === 'settlement'
        ? `3-level engine complete: Level 0 matched ${detStats.level0_matched}/${detStats.level0_total} credits, Level 1 ${detStats.level1_balanced} balanced (${detStats.level1_flagged} flagged), Level 2 unpacked ${detStats.level2_matched}/${detStats.total_records} orders.`
        : `Pass 1 & 2 complete: ${detStats.pass1_matched} exact, ${detStats.pass2_matched} fuzzy matches.`;

    emitPassComplete(run_id, {
      pass: 2,
      percentage: 60,
      stats: detStats,
      message: detMessage,
    });

    // 2. Stage 2: Claude AI Exception Reasoning (Pass 3)
    emitRunProgress(run_id, {
      stage: 'pass3_ai',
      pass: 3,
      percentage: 75,
      message: 'Initiating Pass 3 Claude AI Exception Reasoning & Draft Actions...',
    });

    const { executePass3 } = await import('../services/claudeOrchestrator.js');
    const pass3Result = await executePass3(run_id);

    emitPassComplete(run_id, {
      pass: 3,
      percentage: 100,
      stats: pass3Result,
      message: `Pass 3 complete: ${pass3Result.pass3_matched} AI matches, ${pass3Result.draft_actions_count} draft actions.`,
    });

    emitRunComplete(run_id, {
      status: 'complete',
      stats: pass3Result,
      message: `Reconciliation finished with ${pass3Result.match_rate}% match rate!`,
    });

    return res.status(200).json({
      success: true,
      message: `Full 3-pass reconciliation pipeline executed for run ${run_id}`,
      data: pass3Result,
    });
  } catch (error) {
    emitRunError(run_id, {
      message: error.message,
      code: error.code || 'RECONCILIATION_ERROR',
    });
    next(error);
  }
}

/**
 * Controller: Executes Pass 3 Claude reasoning for a given run_id
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

/**
 * Controller: Lists all Razorpay settlement batches for a run
 * GET /api/runs/:run_id/settlements
 */
export async function listRunSettlements(req, res, next) {
  try {
    const { run_id } = req.params;
    const SettlementReport = (await import('../models/SettlementReport.js')).default;
    const settlements = await SettlementReport.find({ run_id }).sort({ settled_at: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: settlements.length,
      data: settlements,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Retrieves full reconciliation worksheet for a specific settlement batch
 * GET /api/runs/:run_id/settlements/:settlement_id
 */
export async function getRunSettlementDetail(req, res, next) {
  try {
    const { run_id, settlement_id } = req.params;
    const SettlementReport = (await import('../models/SettlementReport.js')).default;
    const SettlementLineItem = (await import('../models/SettlementLineItem.js')).default;
    const BankRecord = (await import('../models/BankRecord.js')).default;

    const settlement = await SettlementReport.findOne({ run_id, settlement_id }).lean();
    if (!settlement) {
      return res.status(404).json({
        error: {
          code: 'SETTLEMENT_NOT_FOUND',
          message: `Settlement "${settlement_id}" not found for run "${run_id}"`,
        },
      });
    }

    const lineItems = await SettlementLineItem.find({ run_id, settlement_id }).lean();
    const bankRecord = settlement.bank_record_id
      ? await BankRecord.findOne({ run_id, id: settlement.bank_record_id }).lean()
      : null;

    return res.status(200).json({
      success: true,
      data: {
        settlement,
        bankRecord,
        line_items_count: lineItems.length,
        line_items: lineItems,
      },
    });
  } catch (error) {
    next(error);
  }
}


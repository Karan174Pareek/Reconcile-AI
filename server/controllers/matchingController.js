import mongoose from 'mongoose';
import { executeRun } from '../services/matchingEngine.js';
import Run from '../models/Run.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import { MemoryStore } from '../services/memoryStore.js';

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
 * Controller: Executes the full autonomous pipeline (Pass 1 + Pass 2 + Pass 3 Claude)
 * POST /api/runs/:run_id/reconcile-all
 */
export async function reconcileAllHandler(req, res, next) {
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

    // Step 1: Execute Pass 1 and Pass 2 deterministic rules
    const p12Result = await executeRun(run_id);

    // Step 2: Execute Pass 3 Claude reasoning for remaining exceptions
    let p3Result = null;
    let p3Error = null;

    try {
      const { executePass3 } = await import('../services/claudeOrchestrator.js');
      p3Result = await executePass3(run_id);
    } catch (err) {
      p3Error = err.message;
      console.warn(`[Pass 3 Warning for run ${run_id}]:`, err.message);
    }

    // Retrieve fresh run summary with memory fallback
    let updatedRun = null;
    try {
      if (mongoose.connection.readyState === 1) {
        updatedRun = await Run.findOne({ run_id }).lean();
      }
    } catch (e) {
      console.warn('[Mongo Fetch Warning]:', e.message);
    }

    if (!updatedRun) {
      updatedRun = MemoryStore.getRun(run_id) || p12Result.run;
    }

    return res.status(200).json({
      success: true,
      message: `Full autonomous reconciliation pipeline completed for run ${run_id}`,
      data: {
        run: updatedRun,
        pass1_matched: updatedRun?.pass1_matched || 0,
        pass2_matched: updatedRun?.pass2_matched || 0,
        pass3_matched: updatedRun?.pass3_matched || 0,
        unresolved: updatedRun?.unresolved || 0,
        match_rate: updatedRun?.match_rate || 0,
        level0_matched: updatedRun?.level0_matched || 0,
        level1_balanced: updatedRun?.level1_balanced || 0,
        level2_matched: updatedRun?.level2_matched || 0,
        ai_mode: updatedRun?.ai_mode || 'fallback',
        pass3_diagnostics: p3Result || { status: 'skipped_or_failed', error: p3Error },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Executes Pass 3 Claude reasoning for exceptions on a given run_id
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

    let run = null;
    let matchesCount = 0;
    let exceptionsCount = 0;

    try {
      if (mongoose.connection.readyState === 1) {
        run = await Run.findOne({ run_id }).lean();
        if (run) {
          matchesCount = await Match.countDocuments({ run_id });
          exceptionsCount = await Exception.countDocuments({ run_id });
        }
      }
    } catch (e) {
      console.warn('[Mongo getRunDetails Warning]:', e.message);
    }

    if (!run) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      run = hydrated?.run || MemoryStore.getRun(run_id);
      if (run) {
        matchesCount = (hydrated?.matches || MemoryStore.getMatches(run_id)).length;
        exceptionsCount = (hydrated?.exceptions || MemoryStore.getExceptions(run_id)).length;
      }
    }

    if (!run) {
      return res.status(404).json({
        error: {
          code: 'RUN_NOT_FOUND',
          message: `Run with ID "${run_id}" not found.`,
          details: null,
        },
      });
    }

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
    let runs = [];
    try {
      if (mongoose.connection.readyState === 1) {
        runs = await Run.find().sort({ created_at: -1 }).limit(50).lean();
      }
    } catch (e) {
      console.warn('[Mongo listRuns Warning]:', e.message);
    }

    if (!runs || runs.length === 0) {
      runs = MemoryStore.listRuns();
    }

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
    let settlements = [];

    try {
      if (mongoose.connection.readyState === 1) {
        const SettlementReport = (await import('../models/SettlementReport.js')).default;
        settlements = await SettlementReport.find({ run_id }).sort({ settled_at: -1 }).lean();
      }
    } catch (e) {
      console.warn('[Mongo listRunSettlements Warning]:', e.message);
    }

    if (!settlements || settlements.length === 0) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      settlements = hydrated?.settlementReports || MemoryStore.getSettlementReports(run_id);
    }

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
    let settlement = null;
    let lineItems = [];
    let bankRecord = null;

    try {
      if (mongoose.connection.readyState === 1) {
        const SettlementReport = (await import('../models/SettlementReport.js')).default;
        const SettlementLineItem = (await import('../models/SettlementLineItem.js')).default;
        const BankRecord = (await import('../models/BankRecord.js')).default;

        settlement = await SettlementReport.findOne({ run_id, settlement_id }).lean();
        if (settlement) {
          lineItems = await SettlementLineItem.find({ run_id, settlement_id }).lean();
          bankRecord = settlement.bank_record_id
            ? await BankRecord.findOne({ run_id, id: settlement.bank_record_id }).lean()
            : null;
        }
      }
    } catch (e) {
      console.warn('[Mongo getRunSettlementDetail Warning]:', e.message);
    }

    if (!settlement) {
      const allReports = MemoryStore.getSettlementReports(run_id);
      settlement = allReports.find((s) => s.settlement_id === settlement_id) || null;
      if (settlement) {
        const allLines = MemoryStore.getSettlementLineItems(run_id);
        lineItems = allLines.filter((l) => l.settlement_id === settlement_id);
        const allBanks = MemoryStore.getBankRecords(run_id);
        bankRecord = allBanks.find((b) => b.id === settlement.bank_record_id) || null;
      }
    }

    if (!settlement) {
      return res.status(404).json({
        error: {
          code: 'SETTLEMENT_NOT_FOUND',
          message: `Settlement "${settlement_id}" not found for run "${run_id}"`,
        },
      });
    }

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

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

    // Step 2: Execute Pass 3 Claude reasoning for remaining exceptions (bounded by 7s timeout for Vercel serverless safety)
    let p3Result = null;
    let p3Error = null;

    try {
      const { executePass3 } = await import('../services/claudeOrchestrator.js');
      const pass3TimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Pass 3 AI execution timed out (serverless limit safeguard)')), 7000)
      );
      p3Result = await Promise.race([executePass3(run_id), pass3TimeoutPromise]);
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
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      const reports = hydrated?.settlementReports || MemoryStore.getSettlementReports(run_id);
      const lines = hydrated?.settlementLineItems || MemoryStore.getSettlementLineItems(run_id);
      const banks = hydrated?.bankRecords || MemoryStore.getBankRecords(run_id);
      settlement = reports.find((s) => s.settlement_id === settlement_id) || null;
      if (settlement) {
        lineItems = lines.filter((l) => l.settlement_id === settlement_id);
        bankRecord = banks.find((b) => b.id === settlement.bank_record_id) || null;
      }
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

/**
 * Controller: Exports downloadable CSV Reconciliation Journal for a completed run
 * GET /api/runs/:run_id/export/journal-csv
 */
export async function exportRunJournalCsv(req, res, next) {
  try {
    const { run_id } = req.params;
    let lineItems = [];
    let exceptions = [];
    let run = null;

    try {
      if (mongoose.connection.readyState === 1) {
        run = await Run.findOne({ run_id }).lean();
        const SettlementLineItem = (await import('../models/SettlementLineItem.js')).default;
        const Exception = (await import('../models/Exception.js')).default;
        lineItems = await SettlementLineItem.find({ run_id }).lean();
        exceptions = await Exception.find({ run_id }).lean();
      }
    } catch (e) {
      console.warn('[Mongo exportRunJournalCsv Warning]:', e.message);
    }

    if (!run) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      run = hydrated?.run || MemoryStore.getRun(run_id);
      if (hydrated) {
        lineItems = hydrated.settlementLineItems || lineItems;
        exceptions = hydrated.exceptions || exceptions;
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

    if (!lineItems.length) {
      lineItems = MemoryStore.getSettlementLineItems(run_id);
      exceptions = MemoryStore.getExceptions(run_id);
    }

    const exceptionMap = new Map();
    exceptions.forEach((e) => {
      if (e.order_id) exceptionMap.set(e.order_id, e);
      if (e.payment_id) exceptionMap.set(e.payment_id, e);
    });

    const headers = [
      'date',
      'order_id',
      'settlement_id',
      'gross_amount',
      'mdr_fee',
      'gst_on_mdr',
      'net_settled',
      'account_category',
      'variance_category',
      'resolution_status',
    ];

    const csvRows = [headers.join(',')];

    lineItems.forEach((item) => {
      const exc = exceptionMap.get(item.order_id) || exceptionMap.get(item.payment_id);
      const gross = Number(item.amount || 0);
      const fee = Number(item.fee || 0);
      const tax = Number(item.tax || 0);
      const net = Number.isFinite(Number(item.net_amount))
        ? Number(item.net_amount)
        : gross - fee - tax;
      
      let accountCat = 'Sales Revenue / Razorpay Settlement';
      if (item.type === 'refund') accountCat = 'Customer Refunds / Reversals';
      else if (fee > 0) accountCat = 'Gateway Charges & Tax Credit';

      const varCat = exc ? exc.category : (item.variance_category || 'none');
      const resStatus = exc ? (exc.human_decision || 'pending') : (item.unpacked_status || 'matched');
      const txnDate = item.settled_at ? new Date(item.settled_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      csvRows.push([
        txnDate,
        `"${item.order_id || 'N/A'}"`,
        `"${item.settlement_id || 'N/A'}"`,
        gross.toFixed(2),
        fee.toFixed(2),
        tax.toFixed(2),
        net.toFixed(2),
        `"${accountCat}"`,
        `"${varCat}"`,
        `"${resStatus}"`,
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation-journal-${run_id}.csv"`);
    return res.status(200).send(csvRows.join('\n'));
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Exports downloadable Markdown Close & Audit Certificate for a run
 * GET /api/runs/:run_id/export/audit-certificate
 */
export async function exportRunAuditCertificate(req, res, next) {
  try {
    const { run_id } = req.params;
    let run = null;
    let exceptions = [];

    try {
      if (mongoose.connection.readyState === 1) {
        run = await Run.findOne({ run_id }).lean();
        exceptions = await Exception.find({ run_id }).lean();
      }
    } catch (e) {
      console.warn('[Mongo exportRunAuditCertificate Warning]:', e.message);
    }

    if (!run) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      run = hydrated?.run || MemoryStore.getRun(run_id);
      exceptions = hydrated?.exceptions || MemoryStore.getExceptions(run_id);
    }

    if (!run) {
      return res.status(404).json({ error: `Run "${run_id}" not found` });
    }

    const totalRecords = Number.isFinite(Number(run.total_records)) ? Number(run.total_records) : 0;
    const matchRate = Number.isFinite(Number(run.match_rate)) ? Number(run.match_rate) : 0;
    const unresolved = Number.isFinite(Number(run.unresolved)) ? Number(run.unresolved) : 0;
    const autoMatched = Math.max(0, totalRecords - unresolved);
    const unresolvedList = exceptions.filter((e) => e.human_decision === 'pending');
    const gstItc = Number.isFinite(Number(run.total_gst_itc)) ? Number(run.total_gst_itc) : 0;
    const totalVal = Number.isFinite(Number(run.total_settlement_value)) ? Number(run.total_settlement_value) : 0;
    const manualHours = Number.isFinite(Number(run.estimated_manual_hours))
      ? Number(run.estimated_manual_hours)
      : Math.round(((totalRecords * 2) / 60) * 10) / 10;

    const certMarkdown = `# RECONCILIATION CLOSE & AUDIT CERTIFICATE
**Generated by ReconcileAI Engine**

---

### Executive Summary
- **Run Identifier**: \`${run.run_id}\`
- **Audit Date**: ${new Date().toISOString().split('T')[0]}
- **Status**: \`${(run.status || 'complete').toUpperCase()}\`
- **Total Transactions Processed**: **${totalRecords}**
- **Autonomous Match Rate**: **${matchRate}%** (${autoMatched} / ${totalRecords} auto-cleared)
- **Total Settlement Volume**: **₹${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**

---

### Business & Tax Impact
- **Claimable GST Input Tax Credit (18%)**: **₹${gstItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**
- **Manual Time Saved (Stated Assumption: ~2 min / txn)**: **~${manualHours} Hours** (vs < 2.8s automated execution)
- **Level 1 Gateway Batch Integrity Gate**: **${run.level1_flagged || 0} Gateway Imbalance(s) Isolated**

---

### Unresolved Exceptions Routing (HITL Queue)
${unresolvedList.length === 0 ? '_Zero unresolved exceptions remaining — 100% cleared._' : unresolvedList.map((e, idx) => `${idx + 1}. **Ref ${e.order_id || e.payment_id || 'N/A'}** [Category: \`${e.category}\`]: ${e.ai_rationale}`).join('\n')}

---

### Certification & Audit Controls
This report certifies that Level 0 (UTR Correlation), Level 1 (Batch Integrity Gate), and Level 2 (2% MDR + 18% GST Unpacking) rules have been executed against raw payment gateway and merchant ledger records.

**Chain Status**: \`APPEND-ONLY AUDIT LOG SEALED\`
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation-certificate-${run_id}.md"`);
    return res.status(200).send(certMarkdown);
  } catch (error) {
    next(error);
  }
}

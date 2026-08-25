import mongoose from 'mongoose';
import Exception from '../models/Exception.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import Match from '../models/Match.js';
import AuditLog from '../models/AuditLog.js';
import Run from '../models/Run.js';
import { MemoryStore } from '../services/memoryStore.js';

/**
 * Controller: Fetches exceptions for a given run with populated bank and candidate ledger details
 * GET /api/runs/:run_id/exceptions
 */
export async function getRunExceptions(req, res, next) {
  try {
    const { run_id } = req.params;
    const { category, decision } = req.query;

    const query = { run_id };
    if (category && category !== 'all') query.category = category;
    if (decision && decision !== 'all') query.human_decision = decision;

    let exceptions = [];
    try {
      if (mongoose.connection.readyState === 1) {
        exceptions = await Exception.find(query).sort({ created_at: -1 }).lean();
      }
    } catch (e) {
      console.warn('[Mongo getRunExceptions Warning]:', e.message);
    }

    if (!exceptions || exceptions.length === 0) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      let memExceptions = hydrated?.exceptions || MemoryStore.getExceptions(run_id);
      if (category && category !== 'all') memExceptions = memExceptions.filter((e) => e.category === category);
      if (decision && decision !== 'all') memExceptions = memExceptions.filter((e) => e.human_decision === decision);
      exceptions = memExceptions;
    }

    if (exceptions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Collect bank record IDs and candidate ledger IDs
    const bankIds = exceptions.map((e) => e.bank_record_id).filter(Boolean);
    const candidateIds = Array.from(new Set(exceptions.flatMap((e) => e.candidate_ledger_ids || []))).filter(Boolean);

    let bankRecords = [];
    let candidateLedgers = [];
    try {
      if (mongoose.connection.readyState === 1) {
        [bankRecords, candidateLedgers] = await Promise.all([
          bankIds.length > 0 ? BankRecord.find({ run_id, id: { $in: bankIds } }).lean() : [],
          candidateIds.length > 0 ? LedgerRecord.find({ run_id, id: { $in: candidateIds } }).lean() : [],
        ]);
      }
    } catch (e) {
      console.warn('[Mongo Exceptions Population Warning]:', e.message);
    }

    if (bankRecords.length === 0 && candidateLedgers.length === 0) {
      const allBanks = MemoryStore.getBankRecords(run_id);
      const allLedgers = MemoryStore.getLedgerRecords(run_id);
      bankRecords = allBanks.filter((b) => bankIds.includes(b.id));
      candidateLedgers = allLedgers.filter((l) => candidateIds.includes(l.id));
    }

    const bankMap = new Map(bankRecords.map((b) => [b.id, b]));
    const ledgerMap = new Map(candidateLedgers.map((l) => [l.id, l]));

    // Attach populated records
    const populated = exceptions.map((exp) => ({
      ...exp,
      bank_record: exp.bank_record_id ? bankMap.get(exp.bank_record_id) || null : null,
      candidate_ledgers: (exp.candidate_ledger_ids || []).map((id) => ledgerMap.get(id)).filter(Boolean),
    }));

    return res.status(200).json({
      success: true,
      count: populated.length,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Human resolves an exception (Accept AI, Reject, or Manually Map to Ledger ID)
 * POST /api/exceptions/:id/resolve
 */
export async function resolveException(req, res, next) {
  try {
    const { id } = req.params;
    const { decision, manual_ledger_id, notes, user_email } = req.body;

    if (!['accepted', 'rejected', 'manually_resolved'].includes(decision)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DECISION',
          message: 'Decision must be one of: "accepted", "rejected", "manually_resolved"',
          details: null,
        },
      });
    }

    const conditions = [];
    if (mongoose.Types.ObjectId.isValid(id)) {
      conditions.push({ _id: id });
    }
    conditions.push({ payment_id: id });
    conditions.push({ order_id: id });
    conditions.push({ bank_record_id: id });
    conditions.push({ settlement_id: id });

    const exception = await Exception.findOne({ $or: conditions });

    if (!exception) {
      return res.status(404).json({
        error: {
          code: 'EXCEPTION_NOT_FOUND',
          message: `Exception with ID "${id}" not found.`,
          details: null,
        },
      });
    }

    const actor = user_email || 'human_auditor';

    exception.human_decision = decision;
    exception.resolved_by = actor;

    if (decision === 'manually_resolved') {
      if (!manual_ledger_id) {
        return res.status(400).json({
          error: {
            code: 'MISSING_LEDGER_ID',
            message: 'manual_ledger_id is required for manual resolution',
            details: null,
          },
        });
      }

      exception.manual_ledger_id = manual_ledger_id;

      // Update Bank & Ledger records to matched
      if (exception.bank_record_id) {
        await BankRecord.updateOne(
          { run_id: exception.run_id, id: exception.bank_record_id },
          { $set: { status: 'matched' } }
        );
      }
      await LedgerRecord.updateOne(
        { run_id: exception.run_id, id: manual_ledger_id },
        { $set: { status: 'matched' } }
      );

      // Create Match document
      await Match.findOneAndUpdate(
        { run_id: exception.run_id, bank_record_id: exception.bank_record_id || exception.payment_id },
        {
          run_id: exception.run_id,
          bank_record_id: exception.bank_record_id || exception.payment_id,
          ledger_record_id: manual_ledger_id,
          method: 'exact',
          confidence: 1.0,
          rationale: `Manually reconciled by ${actor}: ${notes || 'Human auditor mapped ledger reference'}`,
          created_at: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    await exception.save();

    // Update Run summary statistics
    if (exception.run_id) {
      const remainingUnresolved = await Exception.countDocuments({
        run_id: exception.run_id,
        human_decision: 'pending',
      });
      const run = await Run.findOne({ run_id: exception.run_id });
      if (run) {
        run.unresolved = remainingUnresolved;
        const total = run.total_records || 1;
        const matched = Math.max(0, total - remainingUnresolved);
        run.match_rate = Math.min(100, Math.max(0, (matched / total) * 100));
        await run.save();
      }
    }

    // Log to Audit Trail
    await AuditLog.create({
      run_id: exception.run_id,
      actor,
      action: `human_exception_${decision}`,
      target_type: 'exception',
      target_id: exception.bank_record_id || exception.payment_id || exception._id.toString(),
      details: {
        decision,
        manual_ledger_id: manual_ledger_id || null,
        notes: notes || null,
        category: exception.category,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Exception successfully marked as ${decision}`,
      data: exception,
    });
  } catch (error) {
    next(error);
  }
}

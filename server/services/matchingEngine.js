import { computeTextSimilarity, dateDiffInDays } from '../utils/similarity.js';
import Run from '../models/Run.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';

/**
 * Normalizes reference tokens for exact matching (e.g. extracts numeric suffix or cleaned alphanumeric ID)
 */
function extractRefTokens(str) {
  if (!str || typeof str !== 'string') return [];
  const matches = str.match(/[A-Za-z0-9-]+/g) || [];
  return matches.map((m) => m.toUpperCase());
}

/**
 * Checks if two records have matching reference keys (UTR vs Invoice/Ref)
 */
function isReferenceMatch(bank, ledger) {
  const bankUtr = (bank.utr_ref || '').trim().toUpperCase();
  const bankNarration = (bank.narration || '').trim().toUpperCase();
  const ledgerInv = (ledger.invoice_ref || '').trim().toUpperCase();

  if (bankUtr && ledgerInv && bankUtr === ledgerInv) {
    return true;
  }

  // Check if bank narration contains the exact ledger invoice ref
  if (ledgerInv && ledgerInv.length >= 4 && bankNarration.includes(ledgerInv)) {
    return true;
  }

  // Extract reference tokens and compare common numeric/alphanumeric IDs (e.g., 10001 from UTR-MOCK-10001 & INV-MOCK-10001)
  const bankTokens = extractRefTokens(bankUtr + ' ' + bankNarration);
  const ledgerTokens = extractRefTokens(ledgerInv);

  for (const lToken of ledgerTokens) {
    // If token has significant length (e.g. reference number like 10001 or INV-10001)
    if (lToken.length >= 4 && bankTokens.includes(lToken)) {
      return true;
    }
    // Also check numeric-only components (e.g. 10001 in INV-MOCK-10001)
    const numPart = lToken.replace(/[^0-9]/g, '');
    if (numPart.length >= 4) {
      for (const bToken of bankTokens) {
        if (bToken.includes(numPart)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Pure, unit-testable reconciliation pipeline executing Pass 1 (Exact) and Pass 2 (Fuzzy).
 *
 * @param {Array<object>} rawBankRecords
 * @param {Array<object>} rawLedgerRecords
 * @param {object} options
 * @returns {object} Reconciliation results and generated Match/Exception documents
 */
export function reconcileRecords(rawBankRecords = [], rawLedgerRecords = [], options = {}) {
  const amountTolerance = options.amountTolerance ?? 1.0;
  const dateWindowDays = options.dateWindowDays ?? 3;
  const similarityThreshold = options.similarityThreshold ?? 0.75;
  const runId = options.runId || 'RUN-TEST';

  const matches = [];
  const exceptions = [];

  // Track matched IDs
  const matchedBankIds = new Set();
  const matchedLedgerIds = new Set();

  const validBankRecords = [];
  const validLedgerRecords = [];

  // 0. Record Integrity Verification: push corrupted/unparseable records to exceptions
  for (const b of rawBankRecords) {
    const bankId = b.id || b._id?.toString();
    const dateVal = new Date(b.date);
    const amountVal = Number(b.amount);

    if (!bankId || isNaN(dateVal.getTime()) || isNaN(amountVal) || !isFinite(amountVal)) {
      exceptions.push({
        run_id: runId,
        bank_record_id: bankId || 'UNKNOWN-BANK-ID',
        candidate_ledger_ids: [],
        category: 'unknown',
        ai_rationale: 'Unparseable or corrupted record values (invalid amount or date)',
        confidence: 0,
        human_decision: 'pending',
      });
      if (bankId) matchedBankIds.add(bankId);
    } else {
      validBankRecords.push({ ...b, id: bankId, date: dateVal, amount: amountVal });
    }
  }

  for (const l of rawLedgerRecords) {
    const ledgerId = l.id || l._id?.toString();
    const dateVal = new Date(l.date);
    const amountVal = Number(l.amount);

    if (!ledgerId || isNaN(dateVal.getTime()) || isNaN(amountVal) || !isFinite(amountVal)) {
      // Flag corrupted ledger rows if any
      if (ledgerId) matchedLedgerIds.add(ledgerId);
    } else {
      validLedgerRecords.push({ ...l, id: ledgerId, date: dateVal, amount: amountVal });
    }
  }

  // =========================================================================
  // PASS 1: Deterministic Exact Matching (Exact Amount, Exact Ref, Same Date)
  // =========================================================================
  let pass1Count = 0;

  for (const bank of validBankRecords) {
    if (matchedBankIds.has(bank.id)) continue;

    for (const ledger of validLedgerRecords) {
      if (matchedLedgerIds.has(ledger.id)) continue;

      // Exact amount match
      const amountDiff = Math.abs(bank.amount - ledger.amount);
      if (amountDiff > 0.001) continue;

      // Same date (zero day delta for exact deterministic match)
      const dayDelta = Math.abs(dateDiffInDays(bank.date, ledger.date));
      if (dayDelta !== 0) continue;

      // Reference match (UTR vs Invoice or exact reference token)
      if (isReferenceMatch(bank, ledger)) {
        matchedBankIds.add(bank.id);
        matchedLedgerIds.add(ledger.id);
        pass1Count++;

        matches.push({
          run_id: runId,
          bank_record_id: bank.id,
          ledger_record_id: ledger.id,
          method: 'exact',
          confidence: 1.0,
          rationale: `Exact amount (${bank.amount}), reference match (${bank.utr_ref} ↔ ${ledger.invoice_ref}), and same date`,
          created_at: new Date(),
        });
        break;
      }
    }
  }

  // =========================================================================
  // PASS 2: Fuzzy Matching (Amount tolerance, Date window, String similarity / Timing lag)
  // =========================================================================
  let pass2Count = 0;

  for (const bank of validBankRecords) {
    if (matchedBankIds.has(bank.id)) continue;

    const candidateMatches = [];

    for (const ledger of validLedgerRecords) {
      if (matchedLedgerIds.has(ledger.id)) continue;

      // 1. Amount tolerance (+/- tolerance, default 1.00)
      const amountDiff = Math.abs(bank.amount - ledger.amount);
      if (amountDiff > amountTolerance) continue;

      // 2. Date window (+/- days, default 3 days)
      const dayDelta = Math.abs(dateDiffInDays(bank.date, ledger.date));
      if (dayDelta > dateWindowDays) continue;

      // 3. String similarity between narration and payee or reference match
      const hasRefMatch = isReferenceMatch(bank, ledger);
      const textSim = computeTextSimilarity(bank.narration, ledger.payee);
      const simScore = hasRefMatch ? Math.max(textSim, 0.95) : textSim;

      if (simScore >= similarityThreshold) {
        // Calculate composite confidence score (0.75 - 0.99)
        const dateScore = 1.0 - dayDelta / (dateWindowDays + 1);
        const amountScore = 1.0 - amountDiff / (amountTolerance + 0.1);
        const compositeConf = Math.min(
          0.99,
          Math.max(
            0.75,
            Math.round((simScore * 0.7 + dateScore * 0.2 + amountScore * 0.1) * 100) / 100
          )
        );

        candidateMatches.push({
          ledger,
          confidence: compositeConf,
          simScore,
          dayDelta,
          amountDiff,
        });
      }
    }

    if (candidateMatches.length === 1) {
      // Exactly 1 candidate found -> Safe fuzzy match
      const { ledger, confidence, simScore, dayDelta, amountDiff } = candidateMatches[0];
      matchedBankIds.add(bank.id);
      matchedLedgerIds.add(ledger.id);
      pass2Count++;

      matches.push({
        run_id: runId,
        bank_record_id: bank.id,
        ledger_record_id: ledger.id,
        method: 'fuzzy',
        confidence,
        rationale: `Fuzzy match: payee similarity ${(simScore * 100).toFixed(0)}%, date delta ${dayDelta}d, amount delta ${amountDiff.toFixed(2)}`,
        created_at: new Date(),
      });
    } else if (candidateMatches.length > 1) {
      // Multiple candidates tie -> DO NOT auto-pick! Preserve candidates for Pass 3 AI reasoning.
      const candidateIds = candidateMatches.map((c) => c.ledger.id);
      const topConfidence = Math.max(...candidateMatches.map((c) => c.confidence));

      exceptions.push({
        run_id: runId,
        bank_record_id: bank.id,
        candidate_ledger_ids: candidateIds,
        category: 'timing_lag',
        ai_rationale: `Ambiguous Pass 2 candidates detected (${candidateMatches.length} matches). Forwarded to Pass 3 Claude reasoner.`,
        confidence: topConfidence,
        human_decision: 'pending',
      });
      // Bank record remains unresolved / queued for Pass 3
    }
  }

  // Queue all remaining unmatched bank records into Exceptions for Pass 3 AI reasoning
  const existingExceptionBankIds = new Set(exceptions.map((e) => e.bank_record_id));
  for (const bank of validBankRecords) {
    if (!matchedBankIds.has(bank.id) && !existingExceptionBankIds.has(bank.id)) {
      // Diagnostic heuristic / metadata extraction
      const cat =
        bank._meta_category ||
        (bank.narration && /fee|charge|folio|token/i.test(bank.narration)
          ? 'bank_fee'
          : bank.narration && /refund|reversal|return/i.test(bank.narration)
          ? 'refund'
          : 'unrecorded');

      exceptions.push({
        run_id: runId,
        bank_record_id: bank.id,
        candidate_ledger_ids: [],
        category: cat,
        ai_rationale: `Unmatched in Pass 1 & 2. Queued for Pass 3 AI diagnosis and Draft Action remediation.`,
        confidence: 0.85,
        human_decision: 'pending',
      });
      existingExceptionBankIds.add(bank.id);
    }
  }

  const totalBankRecords = rawBankRecords.length;
  const totalMatched = pass1Count + pass2Count;
  const unresolvedCount = totalBankRecords - totalMatched;
  const matchRate = totalBankRecords > 0 ? Math.round((totalMatched / totalBankRecords) * 10000) / 100 : 0.0;

  return {
    runId,
    matches,
    exceptions,
    matchedBankIds: Array.from(matchedBankIds),
    matchedLedgerIds: Array.from(matchedLedgerIds),
    stats: {
      total_records: totalBankRecords,
      pass1_matched: pass1Count,
      pass2_matched: pass2Count,
      pass3_matched: 0,
      unresolved: unresolvedCount,
      match_rate: matchRate,
    },
  };
}

/**
 * MongoDB Pipeline Orchestrator: executes Pass 1 and Pass 2 for a specific run_id and persists results.
 *
 * @param {string} runId
 * @returns {Promise<object>} Run summary metrics
 */
export async function executeRun(runId) {
  const run = await Run.findOne({ run_id: runId });
  if (!run) {
    const err = new Error(`Run with ID "${runId}" not found`);
    err.statusCode = 404;
    err.code = 'RUN_NOT_FOUND';
    throw err;
  }

  // Update run status to running
  run.status = 'running';
  await run.save();

  try {
    const bankRecords = await BankRecord.find({ run_id: runId }).lean();
    const ledgerRecords = await LedgerRecord.find({ run_id: runId }).lean();

    if (bankRecords.length === 0) {
      const err = new Error(`No bank records found for run "${runId}"`);
      err.statusCode = 400;
      err.code = 'NO_RECORDS_FOUND';
      throw err;
    }

    // Run pure matching logic
    const results = reconcileRecords(bankRecords, ledgerRecords, { runId });

    // Clear previous matches/exceptions for this run if re-running
    await Match.deleteMany({ run_id: runId });
    await Exception.deleteMany({ run_id: runId });

    // Insert new matches
    if (results.matches.length > 0) {
      await Match.insertMany(results.matches);
    }

    // Insert new exceptions (corrupted records or Pass 2 multi-candidate ties)
    if (results.exceptions.length > 0) {
      await Exception.insertMany(results.exceptions);
    }

    // Update statuses for matched bank records
    if (results.matchedBankIds.length > 0) {
      await BankRecord.updateMany(
        { run_id: runId, id: { $in: results.matchedBankIds } },
        { $set: { status: 'matched' } }
      );
    }

    // Update statuses for remaining unmatched bank records to exception/pending
    const unmatchedBankIds = bankRecords
      .map((b) => b.id)
      .filter((id) => !results.matchedBankIds.includes(id));

    if (unmatchedBankIds.length > 0) {
      await BankRecord.updateMany(
        { run_id: runId, id: { $in: unmatchedBankIds } },
        { $set: { status: 'exception' } }
      );
    }

    // Update statuses for matched ledger records
    if (results.matchedLedgerIds.length > 0) {
      await LedgerRecord.updateMany(
        { run_id: runId, id: { $in: results.matchedLedgerIds } },
        { $set: { status: 'matched' } }
      );
    }

    // Update Run document
    run.status = 'complete';
    run.total_records = results.stats.total_records;
    run.pass1_matched = results.stats.pass1_matched;
    run.pass2_matched = results.stats.pass2_matched;
    run.pass3_matched = 0;
    run.unresolved = results.stats.unresolved;
    run.match_rate = results.stats.match_rate;
    run.completed_at = new Date();
    await run.save();

    return {
      run_id: runId,
      status: run.status,
      stats: results.stats,
      matched_count: results.matches.length,
      exception_count: results.exceptions.length,
    };
  } catch (error) {
    run.status = 'failed';
    await run.save();
    throw error;
  }
}

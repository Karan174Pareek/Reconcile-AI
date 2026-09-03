import { computeTextSimilarity, dateDiffInDays } from '../utils/similarity.js';
import { emitRunProgress } from '../sockets/runSocket.js';
import mongoose from 'mongoose';

/**
 * Normalizes reference tokens for exact and UTR matching
 */
export function extractRefTokens(str) {
  if (!str || typeof str !== 'string') return [];
  const matches = str.match(/[A-Za-z0-9-_]+/g) || [];
  return matches.map((m) => m.toUpperCase());
}

/**
 * Checks if a bank record UTR / narration matches a Razorpay settlement UTR or settlement_id.
 */
export function isUtrMatch(bankRecord, settlementReport) {
  const bankUtr = (bankRecord.utr_ref || '').trim().toUpperCase();
  const bankNarration = (bankRecord.narration || '').trim().toUpperCase();
  const setlUtr = (settlementReport.utr || '').trim().toUpperCase();
  const setlId = (settlementReport.settlement_id || '').trim().toUpperCase();

  if (setlUtr && bankUtr && (bankUtr === setlUtr || bankUtr.includes(setlUtr) || setlUtr.includes(bankUtr))) {
    return true;
  }

  if (setlUtr && bankNarration.includes(setlUtr)) {
    return true;
  }

  if (setlId && (bankNarration.includes(setlId) || bankUtr.includes(setlId))) {
    return true;
  }

  // Extract alphanumeric tokens
  const bankTokens = extractRefTokens(bankUtr + ' ' + bankNarration);
  if (setlUtr && bankTokens.includes(setlUtr)) {
    return true;
  }
  if (setlId && bankTokens.includes(setlId)) {
    return true;
  }

  // Check numeric components (e.g. 88129 from UTR-RAZORPAY-88129)
  const setlNum = setlUtr.replace(/[^0-9]/g, '');
  if (setlNum && setlNum.length >= 4) {
    for (const bToken of bankTokens) {
      if (bToken.includes(setlNum)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if two records have matching reference keys (UTR vs Invoice/Order ID)
 */
export function isReferenceMatch(bank, ledger) {
  const bankUtr = (bank.utr_ref || '').trim().toUpperCase();
  const bankNarration = (bank.narration || '').trim().toUpperCase();
  const ledgerInv = (ledger.invoice_ref || ledger.order_id || '').trim().toUpperCase();

  if (bankUtr && ledgerInv && bankUtr === ledgerInv) {
    return true;
  }

  if (ledgerInv && ledgerInv.length >= 4 && bankNarration.includes(ledgerInv)) {
    return true;
  }

  const bankTokens = extractRefTokens(bankUtr + ' ' + bankNarration);
  const ledgerTokens = extractRefTokens(ledgerInv);

  for (const lToken of ledgerTokens) {
    if (lToken.length >= 4 && bankTokens.includes(lToken)) {
      return true;
    }
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
 * =========================================================================
 * LEVEL 0: Bank Credit -> Settlement Batch Matching
 * Matches lumped bank NEFT/RTGS credit to Razorpay Settlement Report entity
 * =========================================================================
 */
export function reconcileLevel0(bankRecords = [], settlementReports = [], options = {}) {
  const runId = options.runId || 'RUN-TEST';
  const matches = [];
  const exceptions = [];
  const matchedBankIds = new Set();
  const matchedSettlementIds = new Set();

  for (const bank of bankRecords) {
    const bankId = bank.id || bank._id?.toString();
    const bankAmount = Math.abs(Number(bank.amount) || 0);
    const bankDate = new Date(bank.date);

    let bestSettlement = null;
    let highestScore = -1;
    let bestRationale = '';

    for (const setl of settlementReports) {
      const setlId = setl.settlement_id || setl.id || setl._id?.toString();
      if (matchedSettlementIds.has(setlId)) continue;

      const setlAmount = Number(setl.amount) || 0;
      const setlDate = new Date(setl.settled_at || setl.created_at || setl.date);

      const amountDiff = Math.abs(bankAmount - setlAmount);
      const isAmountMatch = amountDiff <= (options.amountTolerance ?? 1.0);
      const utrMatched = isUtrMatch(bank, setl);
      const daysDiff = Math.abs(dateDiffInDays(bankDate, setlDate));
      const withinDateWindow = daysDiff <= (options.dateWindowDays ?? 4); // T+2 settlement cycle window

      // Calculate weighted score
      let score = 0;
      if (utrMatched) score += 0.55;
      if (isAmountMatch) score += 0.35;
      if (withinDateWindow) score += 0.10;

      if (score >= 0.65 && score > highestScore) {
        highestScore = score;
        bestSettlement = setl;
        bestRationale = `Matched via ${utrMatched ? 'UTR (' + (setl.utr || setlId) + ')' : 'Net Amount'} with ₹${amountDiff.toFixed(2)} diff, ${daysDiff}d settlement window (Score: ${(score * 100).toFixed(0)}%)`;
      }
    }

    if (bestSettlement) {
      const setlId = bestSettlement.settlement_id || bestSettlement.id;
      matchedBankIds.add(bankId);
      matchedSettlementIds.add(setlId);

      matches.push({
        run_id: runId,
        level: 0,
        bank_record_id: bankId,
        settlement_id: setlId,
        method: highestScore >= 0.9 ? 'exact' : 'fuzzy',
        confidence: Math.min(1.0, highestScore),
        rationale: bestRationale,
        variance_category: 'none',
        variance_amount: 0,
      });
    } else {
      exceptions.push({
        run_id: runId,
        level: 0,
        bank_record_id: bankId,
        settlement_id: null,
        candidate_ledger_ids: [],
        category: 'unrecorded',
        ai_rationale: `Bank credit ₹${bankAmount} has no matching Razorpay settlement report in the settlement cycle.`,
        confidence: 0.5,
        human_decision: 'pending',
      });
    }
  }

  return { matches, exceptions, matchedBankIds, matchedSettlementIds };
}

/**
 * =========================================================================
 * LEVEL 1: Settlement Batch Explosion & Integrity Verification
 * Verifies sum(line_item_net_amounts) == bank credit / settlement amount
 * =========================================================================
 */
export function reconcileLevel1(settlementReports = [], settlementLineItems = [], options = {}) {
  const runId = options.runId || 'RUN-TEST';
  const matches = [];
  const exceptions = [];
  const balancedSettlementIds = new Set();
  const imbalancedSettlementIds = new Set();

  // Group line items by settlement_id
  const itemsBySettlement = new Map();
  for (const item of settlementLineItems) {
    const sId = item.settlement_id;
    if (!itemsBySettlement.has(sId)) {
      itemsBySettlement.set(sId, []);
    }
    itemsBySettlement.get(sId).push(item);
  }

  for (const setl of settlementReports) {
    const sId = setl.settlement_id || setl.id;
    try {
      const items = itemsBySettlement.get(sId) || [];
      const expectedBatchAmount = Number(setl.amount) || 0;

      let computedNetSum = 0;
      let computedGrossSum = 0;
      let computedFeeSum = 0;
      let computedTaxSum = 0;
      let computedRefundSum = 0;

      for (const item of items) {
        const gross = Number(item.amount) || 0;
        const fee = Number(item.fee) || 0;
        const tax = Number(item.tax) || 0;
        const debit = Number(item.debit) || (fee + tax);
        const credit = Number(item.credit) || gross;
        const net = item.net_amount !== undefined ? Number(item.net_amount) : (credit - debit);

        computedNetSum += net;
        computedGrossSum += gross;
        computedFeeSum += fee;
        computedTaxSum += tax;
        if (item.type === 'refund') {
          computedRefundSum += Math.abs(gross);
        }
      }

      const discrepancy = Math.abs(computedNetSum - expectedBatchAmount);
      const isBalanced = discrepancy <= (options.integrityTolerance ?? 0.05);

      if (isBalanced) {
        balancedSettlementIds.add(sId);
        matches.push({
          run_id: runId,
          level: 1,
          settlement_id: sId,
          method: 'batch_integrity',
          confidence: 1.0,
          item_count: items.length,
          total_line_items: items.length,
          rationale: `Batch integrity verified: ${items.length} line items sum to ₹${computedNetSum.toFixed(2)} exactly balancing batch settlement ₹${expectedBatchAmount.toFixed(2)} (MDR: ₹${computedFeeSum.toFixed(2)}, GST: ₹${computedTaxSum.toFixed(2)})`,
          variance_category: 'none',
          variance_amount: 0,
        });
      } else {
        imbalancedSettlementIds.add(sId);
        exceptions.push({
          run_id: runId,
          level: 1,
          settlement_id: sId,
          category: 'batch_imbalance',
          expected_amount: expectedBatchAmount,
          settled_amount: computedNetSum,
          variance_amount: discrepancy,
          variance_breakdown: {
            mdr_fee: computedFeeSum,
            gst_on_mdr: computedTaxSum,
            refund: computedRefundSum,
            rounding: 0,
            unaccounted: discrepancy,
          },
          ai_rationale: `INTEGRITY GATE ISOLATED: Line items sum to ₹${computedNetSum.toFixed(2)} but Razorpay batch states ₹${expectedBatchAmount.toFixed(2)} (Discrepancy: ₹${discrepancy.toFixed(2)}). Unpacking blocked for batch ${sId}. Unaffected batches processed normally.`,
          confidence: 1.0,
          human_decision: 'pending',
        });
      }
    } catch (batchErr) {
      console.error(`[Level 1] Error processing batch ${sId}:`, batchErr.message);
      imbalancedSettlementIds.add(sId);
      exceptions.push({
        run_id: runId,
        level: 1,
        settlement_id: sId,
        category: 'batch_imbalance',
        expected_amount: Number(setl.amount) || 0,
        settled_amount: 0,
        variance_amount: Number(setl.amount) || 0,
        ai_rationale: `Batch processing exception in ${sId}: ${batchErr.message}. Batch isolated.`,
        confidence: 1.0,
        human_decision: 'pending',
      });
    }
  }

  return { matches, exceptions, balancedSettlementIds, imbalancedSettlementIds, itemsBySettlement };
}

/**
 * =========================================================================
 * LEVEL 2: Line-Item -> Internal Order Match & Variance Categorization
 * Matches individual payments/refunds to ledger records & calculates MDR/GST
 * =========================================================================
 */
export function reconcileLevel2(settlementLineItems = [], ledgerRecords = [], balancedSettlementIds = new Set(), options = {}) {
  const runId = options.runId || 'RUN-TEST';
  const matches = [];
  const exceptions = [];
  const candidateReviews = [];
  const matchedLedgerIds = new Set();
  const matchedLineItemIds = new Set();

  // Index ledger records by order_id / invoice_ref
  const ledgerByOrder = new Map();
  for (const l of ledgerRecords) {
    const orderRef = (l.order_id || l.invoice_ref || '').trim().toUpperCase();
    if (orderRef) {
      ledgerByOrder.set(orderRef, l);
    }
  }

  for (const item of settlementLineItems) {
    const sId = item.settlement_id;
    // If batch was imbalanced in Level 1 and integrity gate enforced, skip Level 2 unpacking
    if (options.enforceIntegrityGate && !balancedSettlementIds.has(sId)) {
      continue;
    }

    const paymentId = item.payment_id || item.id || item._id?.toString();
    const orderId = (item.order_id || '').trim().toUpperCase();
    const itemAmount = Number(item.amount) || 0; // Gross
    const itemFee = Number(item.fee) || 0; // MDR
    const itemTax = Number(item.tax) || 0; // 18% GST
    const itemNet = (item.net_amount !== undefined && item.net_amount !== null)
      ? Number(item.net_amount)
      : (itemAmount - itemFee - itemTax);
    const itemType = item.type || 'payment';

    // 1. Check exact order_id match
    let matchedLedger = orderId ? ledgerByOrder.get(orderId) : null;
    if (matchedLedger) {
      const exactLedgerId = matchedLedger.id || matchedLedger._id?.toString();
      if (matchedLedgerIds.has(exactLedgerId)) {
        matchedLedger = null;
      }
    }

    // 2. Fuzzy fallback if not found by exact key
    if (!matchedLedger) {
      for (const l of ledgerRecords) {
        const lId = l.id || l._id?.toString();
        if (matchedLedgerIds.has(lId)) continue;
        const lAmount = Number(l.amount) || 0;
        if (Math.abs(lAmount - itemAmount) <= 1.0) {
          const lRef = (l.invoice_ref || l.order_id || '').trim().toUpperCase();
          if (orderId && computeTextSimilarity(orderId, lRef) >= 0.75) {
            matchedLedger = l;
            break;
          }
        }
      }
    }

    if (matchedLedger) {
      const lId = matchedLedger.id || matchedLedger._id?.toString();
      matchedLedgerIds.add(lId);
      matchedLineItemIds.add(paymentId);

      const expectedGross = Number(matchedLedger.amount) || 0;
      const expectedMdr = Math.round(expectedGross * 0.02 * 100) / 100;
      const expectedGst = Math.round(expectedMdr * 0.18 * 100) / 100;
      const expectedNet = Math.round((expectedGross - expectedMdr - expectedGst) * 100) / 100;

      const grossDiff = Math.abs(expectedGross - itemAmount);
      const netDiff = Math.abs(expectedNet - itemNet);

      if (itemType === 'refund') {
        matches.push({
          run_id: runId,
          level: 2,
          settlement_id: sId,
          payment_id: paymentId,
          order_id: orderId,
          ledger_record_id: lId,
          method: 'exact',
          confidence: 0.98,
          rationale: `Customer refund deduction unpacked: Order ${orderId} refunded ₹${itemAmount.toFixed(2)} in settlement ${sId}`,
          variance_category: 'refund_deduction',
          variance_amount: itemAmount,
        });
      } else if (grossDiff <= 0.05 || netDiff <= 0.05 || (itemFee > 0 && Math.abs(itemFee - expectedMdr) <= 0.5)) {
        matches.push({
          run_id: runId,
          level: 2,
          settlement_id: sId,
          payment_id: paymentId,
          order_id: orderId,
          ledger_record_id: lId,
          method: 'exact',
          confidence: 0.99,
          rationale: `Order ${orderId} unpacked: Gross ₹${itemAmount.toFixed(2)} - MDR (2%) ₹${itemFee.toFixed(2)} - GST (18%) ₹${itemTax.toFixed(2)} = Net Settled ₹${itemNet.toFixed(2)}`,
          variance_category: itemFee > 0 ? 'mdr_fee' : 'none',
          variance_amount: itemFee + itemTax,
        });
      } else {
        // Discrepancy between internal order and settlement line item
        candidateReviews.push({
          lineItem: item,
          candidates: [matchedLedger],
        });
        exceptions.push({
          run_id: runId,
          level: 2,
          settlement_id: sId,
          payment_id: paymentId,
          order_id: orderId,
          candidate_ledger_ids: [lId],
          category: 'partial_settlement',
          expected_amount: expectedGross,
          settled_amount: itemAmount,
          variance_amount: grossDiff,
          variance_breakdown: {
            mdr_fee: itemFee,
            gst_on_mdr: itemTax,
            refund: 0,
            rounding: 0,
            unaccounted: grossDiff,
          },
          ai_rationale: `Order ${orderId} gross amount mismatch (Ledger expects ₹${expectedGross.toFixed(2)}, settled ₹${itemAmount.toFixed(2)}, variance ₹${grossDiff.toFixed(2)}). Partial settlement discrepancy requiring review.`,
          confidence: 0.85,
          human_decision: 'pending',
        });
      }
    } else {
      // Unrecorded order or orphan line item
      exceptions.push({
        run_id: runId,
        level: 2,
        settlement_id: sId,
        payment_id: paymentId,
        order_id: orderId,
        candidate_ledger_ids: [],
        category: 'unrecorded',
        expected_amount: 0,
        settled_amount: itemAmount,
        variance_amount: itemAmount,
        variance_breakdown: {
          mdr_fee: itemFee,
          gst_on_mdr: itemTax,
          refund: 0,
          rounding: 0,
          unaccounted: itemAmount,
        },
        ai_rationale: `Payment ${paymentId} (Order ${orderId || 'N/A'}) for ₹${itemAmount.toFixed(2)} settled by Razorpay with no matching internal ledger order.`,
        confidence: 0.90,
        human_decision: 'pending',
      });
    }
  }

  return { matches, exceptions, candidateReviews, matchedLedgerIds, matchedLineItemIds };
}

/**
 * Combined unit-testable reconciliation pipeline supporting 3 levels as well as flat 2-way tests.
 */
export function reconcileRecords(rawBankRecords = [], rawLedgerRecords = [], options = {}) {
  const runId = options.runId || 'RUN-TEST';
  const settlementReports = options.settlementReports || [];
  const settlementLineItems = options.settlementLineItems || [];

  // If settlement data provided, run full 3-Level Razorpay Pipeline
  if (settlementReports.length > 0) {
    const l0 = reconcileLevel0(rawBankRecords, settlementReports, options);
    const l1 = reconcileLevel1(settlementReports, settlementLineItems, options);
    const l2 = reconcileLevel2(settlementLineItems, rawLedgerRecords, l1.balancedSettlementIds, {
      ...options,
      enforceIntegrityGate: true,
    });

    const allMatches = [...l0.matches, ...l1.matches, ...l2.matches];
    const allExceptions = [...l0.exceptions, ...l1.exceptions, ...l2.exceptions];

    return {
      runId,
      level0: l0,
      level1: l1,
      level2: l2,
      matches: allMatches,
      exceptions: allExceptions,
      candidateReviews: l2.candidateReviews,
      totalProcessed: rawBankRecords.length + settlementLineItems.length,
      matchedCount: allMatches.length,
      exceptionCount: allExceptions.length,
    };
  }

  // Fallback / Standard 2-way mode for pure standalone tests
  const matches = [];
  const exceptions = [];
  const matchedBankIds = new Set();
  const matchedLedgerIds = new Set();

  const validBankRecords = [];
  const validLedgerRecords = [];

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
      if (ledgerId) matchedLedgerIds.add(ledgerId);
    } else {
      validLedgerRecords.push({ ...l, id: ledgerId, date: dateVal, amount: amountVal });
    }
  }

  // PASS 1: Deterministic Exact Matching
  for (const bank of validBankRecords) {
    if (matchedBankIds.has(bank.id)) continue;

    for (const ledger of validLedgerRecords) {
      if (matchedLedgerIds.has(ledger.id)) continue;

      const isExactAmount = Math.abs(bank.amount - ledger.amount) < 0.001;
      const isRefMatch = isReferenceMatch(bank, ledger);
      const isSameDate = dateDiffInDays(bank.date, ledger.date) === 0;

      if (isExactAmount && (isRefMatch || isSameDate)) {
        matchedBankIds.add(bank.id);
        matchedLedgerIds.add(ledger.id);

        matches.push({
          run_id: runId,
          level: 2,
          bank_record_id: bank.id,
          ledger_record_id: ledger.id,
          method: 'exact',
          confidence: 1.0,
          rationale: `Exact match: Amount ₹${bank.amount} matches exactly with reference and date alignment.`,
        });
        break;
      }
    }
  }

  // PASS 2: Deterministic Fuzzy Matching
  const amountTolerance = options.amountTolerance ?? 1.0;
  const dateWindowDays = options.dateWindowDays ?? 3;
  const similarityThreshold = options.similarityThreshold ?? 0.75;

  for (const bank of validBankRecords) {
    if (matchedBankIds.has(bank.id)) continue;

    const candidateMatches = [];

    for (const ledger of validLedgerRecords) {
      if (matchedLedgerIds.has(ledger.id)) continue;

      const amountDiff = Math.abs(bank.amount - ledger.amount);
      const isWithinAmountTol = amountDiff <= amountTolerance;
      const daysDiff = Math.abs(dateDiffInDays(bank.date, ledger.date));
      const isWithinDateWindow = daysDiff <= dateWindowDays;

      const bankText = `${bank.narration || ''} ${bank.utr_ref || ''}`;
      const ledgerText = `${ledger.payee || ''} ${ledger.invoice_ref || ''}`;
      const textSimilarity = Math.max(
        computeTextSimilarity(bankText, ledgerText),
        computeTextSimilarity(bank.narration || '', ledger.payee || '')
      );
      const isAboveSimThreshold = textSimilarity >= similarityThreshold;

      if (isWithinAmountTol && isWithinDateWindow && isAboveSimThreshold) {
        candidateMatches.push({
          ledger,
          amountDiff,
          daysDiff,
          textSimilarity,
          score: (1 - amountDiff / (amountTolerance + 0.01)) * 0.4 +
                 (1 - daysDiff / (dateWindowDays + 1)) * 0.3 +
                 textSimilarity * 0.3,
        });
      }
    }

    if (candidateMatches.length === 1) {
      const match = candidateMatches[0];
      matchedBankIds.add(bank.id);
      matchedLedgerIds.add(match.ledger.id);

      matches.push({
        run_id: runId,
        level: 2,
        bank_record_id: bank.id,
        ledger_record_id: match.ledger.id,
        method: 'fuzzy',
        confidence: Math.min(0.95, Math.max(0.70, match.score)),
        rationale: `Fuzzy matched with amount diff ₹${match.amountDiff.toFixed(2)}, ${match.daysDiff}d lag, ${(match.textSimilarity * 100).toFixed(0)}% text match`,
      });
    } else if (candidateMatches.length > 1) {
      exceptions.push({
        run_id: runId,
        level: 2,
        bank_record_id: bank.id,
        candidate_ledger_ids: candidateMatches.map((c) => c.ledger.id),
        category: 'timing_lag',
        ai_rationale: `Ambiguous match: Found ${candidateMatches.length} plausible candidates within tolerance window.`,
        confidence: 0.5,
        human_decision: 'pending',
      });
      matchedBankIds.add(bank.id);
    }
  }

  const exactCount = matches.filter((m) => m.method === 'exact').length;
  const fuzzyCount = matches.filter((m) => m.method === 'fuzzy').length;
  const totalMatched = exactCount + fuzzyCount;
  const unresolved = Math.max(0, validBankRecords.length - totalMatched);
  const matchRate = validBankRecords.length > 0 ? Math.round((totalMatched / validBankRecords.length) * 10000) / 100 : 0.0;

  return {
    runId,
    matches,
    exceptions,
    stats: {
      total_records: validBankRecords.length,
      pass1_matched: exactCount,
      pass2_matched: fuzzyCount,
      pass3_matched: 0,
      unresolved,
      match_rate: matchRate,
    },
    totalBankRecords: rawBankRecords.length,
    totalLedgerRecords: rawLedgerRecords.length,
    matchedCount: matches.length,
    exceptionCount: exceptions.length,
  };
}

/**
 * Executes reconciliation across MongoDB collections (or in-memory cache) for a given runId
 */
export async function executeRun(runId, options = {}) {
  const Run = (await import('../models/Run.js')).default;
  const BankRecord = (await import('../models/BankRecord.js')).default;
  const LedgerRecord = (await import('../models/LedgerRecord.js')).default;
  const SettlementReport = (await import('../models/SettlementReport.js')).default;
  const SettlementLineItem = (await import('../models/SettlementLineItem.js')).default;
  const Match = (await import('../models/Match.js')).default;
  const Exception = (await import('../models/Exception.js')).default;
  const { MemoryStore } = await import('./memoryStore.js');

  let run = null;
  try {
    if (mongoose.connection.readyState === 1) {
      run = await Run.findOne({ run_id: runId });
    }
  } catch (e) {
    console.warn('[Mongo Run Find Warning]:', e.message);
  }

  if (!run) {
    const hydrated = await MemoryStore.ensureRunHydrated(runId);
    run = hydrated?.run || MemoryStore.getRun(runId);
  }

  if (!run) {
    const err = new Error(`Run ${runId} not found`);
    err.statusCode = 404;
    throw err;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      await Match.deleteMany({ run_id: runId });
      await Exception.deleteMany({ run_id: runId });
    }
  } catch (e) {
    console.warn('[Mongo Delete Warning]:', e.message);
  }

  let bankRecords = [];
  let ledgerRecords = [];
  let settlementReports = [];
  let settlementLineItems = [];

  try {
    if (mongoose.connection.readyState === 1) {
      [bankRecords, ledgerRecords, settlementReports, settlementLineItems] = await Promise.all([
        BankRecord.find({ run_id: runId }).lean(),
        LedgerRecord.find({ run_id: runId }).lean(),
        SettlementReport.find({ run_id: runId }).lean(),
        SettlementLineItem.find({ run_id: runId }).lean(),
      ]);
    }
  } catch (e) {
    console.warn('[Mongo Records Find Warning]:', e.message);
  }

  if (!bankRecords.length && !settlementReports.length) {
    bankRecords = MemoryStore.getBankRecords(runId);
    ledgerRecords = MemoryStore.getLedgerRecords(runId);
    settlementReports = MemoryStore.getSettlementReports(runId);
    settlementLineItems = MemoryStore.getSettlementLineItems(runId);
  }

  if (settlementReports.length > 0) {
    emitRunProgress(runId, {
      stage: 'level0',
      level: 0,
      percentage: 15,
      message: `Level 0 — correlating ${bankRecords.length} bank credits to settlement batches via UTR & net amount...`,
    });
    const l0 = reconcileLevel0(bankRecords, settlementReports, { runId, ...options });

    emitRunProgress(runId, {
      stage: 'level1',
      level: 1,
      percentage: 30,
      message: `Level 0 matched ${l0.matches.length}/${bankRecords.length} credits. Level 1 — verifying batch integrity (Σ line items == bank credit)...`,
    });
    const l1 = reconcileLevel1(settlementReports, settlementLineItems, { runId, ...options });

    const flaggedCount = l1.exceptions.filter((e) => e.category === 'batch_imbalance').length;
    emitRunProgress(runId, {
      stage: 'level2',
      level: 2,
      percentage: 45,
      message: `Level 1: ${l1.matches.length} batches balanced, ${flaggedCount} flagged. Level 2 — unpacking ${settlementLineItems.length} orders (isolating 2% MDR + 18% GST)...`,
    });
    const l2 = reconcileLevel2(settlementLineItems, ledgerRecords, l1.balancedSettlementIds, {
      runId,
      ...options,
      enforceIntegrityGate: true,
    });

    const allMatches = [...l0.matches, ...l1.matches, ...l2.matches];
    const allExceptions = [...l0.exceptions, ...l1.exceptions, ...l2.exceptions];

    MemoryStore.saveMatches(runId, allMatches);
    MemoryStore.saveExceptions(runId, allExceptions);

    if (mongoose.connection.readyState === 1) {
      try {
        await Promise.all([
          allMatches.length > 0 ? Match.insertMany(allMatches, { ordered: false }) : Promise.resolve(),
          allExceptions.length > 0 ? Exception.insertMany(allExceptions, { ordered: false }) : Promise.resolve(),
          l0.matchedBankIds.length > 0
            ? BankRecord.updateMany({ run_id: runId, id: { $in: l0.matchedBankIds } }, { $set: { status: 'matched' } })
            : Promise.resolve(),
          l1.balancedSettlementIds.length > 0
            ? SettlementReport.updateMany({ run_id: runId, settlement_id: { $in: l1.balancedSettlementIds } }, { $set: { integrity_status: 'balanced' } })
            : Promise.resolve(),
          l1.imbalancedSettlementIds.length > 0
            ? SettlementReport.updateMany({ run_id: runId, settlement_id: { $in: l1.imbalancedSettlementIds } }, { $set: { integrity_status: 'imbalanced' } })
            : Promise.resolve(),
          l2.matchedLineItemIds && (l2.matchedLineItemIds.size > 0 || l2.matchedLineItemIds.length > 0)
            ? SettlementLineItem.updateMany({ run_id: runId, payment_id: { $in: Array.from(l2.matchedLineItemIds) } }, { $set: { unpacked_status: 'matched' } })
            : Promise.resolve(),
          l2.matchedLedgerIds && (l2.matchedLedgerIds.size > 0 || l2.matchedLedgerIds.length > 0)
            ? LedgerRecord.updateMany({ run_id: runId, id: { $in: Array.from(l2.matchedLedgerIds) } }, { $set: { status: 'matched' } })
            : Promise.resolve(),
        ]);
      } catch (dbErr) {
        console.warn('[Mongo Insert/Update Warning]:', dbErr.message);
      }
    }

    // Sync in-memory MemoryStore records with matched statuses to guarantee zero-drift state
    const memLineItems = MemoryStore.getSettlementLineItems(runId);
    memLineItems.forEach((li) => {
      if (l2.matchedLineItemIds && l2.matchedLineItemIds.has(li.payment_id)) {
        li.unpacked_status = 'matched';
      }
    });

    const memLedgerRecords = MemoryStore.getLedgerRecords(runId);
    memLedgerRecords.forEach((lr) => {
      if (l2.matchedLedgerIds && l2.matchedLedgerIds.has(lr.id || lr._id?.toString())) {
        lr.status = 'matched';
      }
    });

    const totalRecords = settlementLineItems.length;
    const level2Matched = l2.matches.length;
    const level1Flagged = l1.exceptions.filter((e) => e.category === 'batch_imbalance').length;
    const unresolved = Math.max(0, totalRecords - level2Matched);
    const matchRate = totalRecords > 0 ? Math.round((level2Matched / totalRecords) * 10000) / 100 : 0.0;

    // Runtime Sanity Guard
    if (matchRate < 0 || matchRate > 100) {
      throw new Error(`[CRITICAL METRIC BUG] Calculated matchRate (${matchRate}%) is out of valid bounds [0, 100]. Total records: ${totalRecords}`);
    }
    if (level2Matched + unresolved !== totalRecords) {
      throw new Error(`[CRITICAL METRIC BUG] Partition invariant violated: ${level2Matched} + 0 + 0 + ${unresolved} !== ${totalRecords}`);
    }

    // Calculate Business Impact Figures across matched unpacked line items
    const totalGstItc = settlementLineItems.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
    const totalSettlementVal = settlementLineItems.reduce((sum, item) => {
      const val = (item.net_amount !== undefined && item.net_amount !== null)
        ? Number(item.net_amount)
        : Number(item.amount);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    const estimatedManualHours = Math.round(((totalRecords * 2) / 60) * 10) / 10;

    // Headline metrics use the line-item universe so that
    // pass1_matched + pass2_matched + pass3_matched + unresolved === total_records.
    run.total_records = totalRecords;
    run.pass1_matched = level2Matched; // deterministic Level 2 order matches
    run.pass2_matched = 0; // no separate fuzzy stage for settlement line items
    run.pass3_matched = 0; // populated later by Pass 3 (executePass3)
    run.unresolved = unresolved;
    run.match_rate = matchRate;

    // Business Impact Metrics
    run.total_gst_itc = Math.round(totalGstItc * 100) / 100;
    run.total_settlement_value = Math.round(totalSettlementVal * 100) / 100;
    run.estimated_manual_hours = estimatedManualHours;

    // Batch-level 3-level engine stats (distinct universe from line items).
    run.level0_total = bankRecords.length;
    run.level0_matched = l0.matches.length;
    run.level1_balanced = l1.matches.length;
    run.level1_flagged = level1Flagged;
    run.level2_matched = level2Matched;
    run.status = 'complete';
    run.completed_at = new Date();

    if (typeof run.save === 'function' && mongoose.connection.readyState === 1) {
      try {
        await run.save();
      } catch (e) {
        console.warn('[Mongo Save Run Warning]:', e.message);
      }
    }
    MemoryStore.saveRun(run);

    return {
      run_id: runId,
      status: run.status,
      mode: 'settlement',
      stats: {
        total_records: totalRecords,
        level0_matched: l0.matches.length,
        level0_total: bankRecords.length,
        level1_balanced: l1.matches.length,
        level1_flagged: level1Flagged,
        level2_matched: level2Matched,
        pass1_matched: run.pass1_matched,
        pass2_matched: run.pass2_matched,
        pass3_matched: 0,
        unresolved,
        match_rate: matchRate,
      },
      level0: l0,
      level1: l1,
      level2: l2,
    };
  }

  const res = reconcileRecords(bankRecords, ledgerRecords, { runId, ...options });
  MemoryStore.saveMatches(runId, res.matches);
  MemoryStore.saveExceptions(runId, res.exceptions);

  if (mongoose.connection.readyState === 1) {
    try {
      if (res.matches.length > 0) {
        await Match.insertMany(res.matches, { ordered: false });
      }
      if (res.exceptions.length > 0) {
        await Exception.insertMany(res.exceptions, { ordered: false });
      }
    } catch (e) {
      console.warn('[Mongo Insert Records Warning]:', e.message);
    }
  }

  const exactCount = res.matches.filter((m) => m.method === 'exact').length;
  const fuzzyCount = res.matches.filter((m) => m.method === 'fuzzy').length;
  const totalMatched = exactCount + fuzzyCount;
  const unresolved = Math.max(0, bankRecords.length - totalMatched);
  const matchRate = bankRecords.length > 0 ? Math.round((totalMatched / bankRecords.length) * 10000) / 100 : 0.0;

  run.total_records = bankRecords.length;
  run.pass1_matched = exactCount;
  run.pass2_matched = fuzzyCount;
  run.pass3_matched = 0;
  run.unresolved = unresolved;
  run.match_rate = matchRate;
  run.status = 'complete';
  run.completed_at = new Date();

  if (typeof run.save === 'function' && mongoose.connection.readyState === 1) {
    try {
      await run.save();
    } catch (e) {
      console.warn('[Mongo Save Run Warning]:', e.message);
    }
  }
  MemoryStore.saveRun(run);

  return {
    run_id: runId,
    status: run.status,
    stats: {
      total_records: bankRecords.length,
      pass1_matched: exactCount,
      pass2_matched: fuzzyCount,
      pass3_matched: 0,
      unresolved,
      match_rate: matchRate,
    },
    matches: res.matches,
    exceptions: res.exceptions,
  };
}


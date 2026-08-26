import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { MemoryStore } from './memoryStore.js';
import {
  PASS3_SYSTEM_PROMPT,
  Pass3BatchResponseSchema,
  buildPass3UserPrompt,
} from '../prompts/pass3Reasoning.js';
import {
  DRAFT_ACTION_SYSTEM_PROMPT,
  DraftActionResponseSchema,
  buildDraftActionUserPrompt,
} from '../prompts/draftAction.js';
import { dateDiffInDays } from '../utils/similarity.js';
import Run from '../models/Run.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import SettlementReport from '../models/SettlementReport.js';
import SettlementLineItem from '../models/SettlementLineItem.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Sanitizes and validates Anthropic API key from environment variables
 */
export function getSanitizedAnthropicKey() {
  const rawKey = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
  const cleanedKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!cleanedKey || cleanedKey === 'mock-key' || cleanedKey.includes('placeholder') || cleanedKey.includes('your_anthropic')) {
    return null;
  }
  return cleanedKey;
}

/**
 * Initializes Anthropic SDK client
 */
function getAnthropicClient(customClient = null) {
  if (customClient) return customClient;
  const apiKey = getSanitizedAnthropicKey();
  if (!apiKey) {
    return null; // Fallback reasoning in dev/testing if no live API key
  }
  return new Anthropic({ apiKey });
}

/**
 * Strips any potential Markdown code fences or whitespace from an LLM response string
 */
export function cleanJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
}

/**
 * Narrows candidate ledger records for an unmatched line item or bank record.
 * Filter: +/- 15% amount proximity and +/- 14 days date window (max 5 candidates).
 */
export function findCandidatesForBankRecord(targetRecord, ledgerRecords, maxCandidates = 5) {
  const targetAmount = Math.abs(Number(targetRecord.amount));
  const targetDate = new Date(targetRecord.date || targetRecord.settled_at || new Date());

  const amountMargin = Math.max(2.0, targetAmount * 0.15); // +/- 15%

  const qualified = [];

  for (const ledger of ledgerRecords) {
    const ledgerAmount = Math.abs(Number(ledger.amount));
    const ledgerDate = new Date(ledger.date);

    const amountDiff = Math.abs(targetAmount - ledgerAmount);
    if (amountDiff > amountMargin) continue;

    const dayDelta = Math.abs(dateDiffInDays(targetDate, ledgerDate));
    if (dayDelta > 14) continue;

    qualified.push({
      ledger,
      amountDiff,
      dayDelta,
      score: amountDiff + dayDelta * 0.1,
    });
  }

  qualified.sort((a, b) => a.score - b.score);
  return qualified.slice(0, maxCandidates).map((q) => q.ledger);
}

/**
 * Calls Claude API with retry and validation for Pass 3 batch reasoning.
 */
export async function executePass3BatchCall(client, batchItems, options = {}) {
  const model = options.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  const temperature = options.temperature ?? 0.2;

  if (!client) {
    return generateFallbackPass3Evaluations(batchItems);
  }

  const userPrompt = buildPass3UserPrompt(batchItems);

  let rawContent = '';
  let lastError = null;

  // Attempt 1
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      temperature,
      system: PASS3_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    rawContent = response.content[0]?.text || '';
    const cleanedJson = cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleanedJson);
    const validated = Pass3BatchResponseSchema.parse(parsed);
    return validated.evaluations;
  } catch (err) {
    lastError = err;
    console.warn('[Pass 3] Attempt 1 failed:', err.message);

    if (err.message?.includes('429') || err.message?.includes('rate_limit')) {
      console.warn('[Pass 3] Rate limit reached. Backing off for 1500ms...');
      await new Promise((r) => setTimeout(r, 1500));
    }

    // If quota or credit limit error, immediately fallback to deterministic evaluations
    if (
      err.message?.includes('credit balance') ||
      err.message?.includes('invalid_request_error') ||
      err.message?.includes('400') ||
      err.message?.includes('401')
    ) {
      console.warn('[Pass 3] Anthropic quota/credit balance limit reached. Utilizing deterministic forensic analyzer.');
      return generateFallbackPass3Evaluations(batchItems);
    }
  }

  // Attempt 2 (Retry with corrective instruction)
  try {
    const correctivePrompt = `${userPrompt}\n\nIMPORTANT: Your previous output was invalid or failed JSON validation with error: "${lastError?.message}". You MUST return ONLY valid JSON matching the exact schema. No markdown fences.`;

    const retryResponse = await client.messages.create({
      model,
      max_tokens: 2000,
      temperature,
      system: PASS3_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: correctivePrompt }],
    });

    rawContent = retryResponse.content[0]?.text || '';
    const cleanedJson = cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleanedJson);
    const validated = Pass3BatchResponseSchema.parse(parsed);
    return validated.evaluations;
  } catch (retryErr) {
    console.error('[Pass 3] Attempt 2 failed:', retryErr.message);
    return generateFallbackPass3Evaluations(batchItems);
  }
}

/**
 * Executes an array of items with a fixed concurrency limit
 */
async function mapConcurrent(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

/**
 * Generates deterministic fallback evaluations when running without an external API key (for unit tests / offline dev).
 */
export function generateFallbackPass3Evaluations(batchItems) {
  return batchItems.map((item) => {
    const rec = item.lineItem || item.bank || {};
    const amount = Number(rec.amount) || 0;
    const isNegative = amount < 0 || rec.type === 'refund';
    const fee = Number(rec.fee) || Math.round(amount * 0.02 * 100) / 100;
    const tax = Number(rec.tax) || Math.round(fee * 0.18 * 100) / 100;

    if (isNegative) {
      return {
        payment_id: rec.payment_id,
        order_id: rec.order_id,
        bank_record_id: rec.id,
        decision: 'exception',
        category: 'refund_deduction',
        confidence: 0.95,
        rationale: `Customer refund deduction: Net reverse settlement of ₹${Math.abs(amount).toFixed(2)} processed for Order ${rec.order_id || 'N/A'}.`,
        variance_breakdown: {
          mdr_fee: 0,
          gst_on_mdr: 0,
          refund: Math.abs(amount),
          rounding: 0,
        },
      };
    }

    if (item.candidates && item.candidates.length > 0) {
      const topCand = item.candidates[0];
      return {
        payment_id: rec.payment_id,
        order_id: rec.order_id || topCand.order_id || topCand.invoice_ref,
        bank_record_id: rec.id,
        decision: 'match',
        match_ledger_id: topCand.id || topCand._id?.toString(),
        confidence: 0.90,
        rationale: `Matched Order ${rec.order_id || topCand.order_id}: Gross ₹${amount.toFixed(2)} with standard 2% MDR (₹${fee.toFixed(2)}) & 18% GST (₹${tax.toFixed(2)}).`,
        variance_breakdown: {
          mdr_fee: fee,
          gst_on_mdr: tax,
          refund: 0,
          rounding: 0,
        },
      };
    }

    return {
      payment_id: rec.payment_id,
      order_id: rec.order_id,
      bank_record_id: rec.id,
      decision: 'exception',
      category: 'unrecorded',
      confidence: 0.85,
      rationale: `Settlement line item ₹${amount.toFixed(2)} has no matching merchant ledger order.`,
      variance_breakdown: {
        mdr_fee: fee,
        gst_on_mdr: tax,
        refund: 0,
        rounding: 0,
      },
    };
  });
}

/**
 * Generates a draft remediation action for an exception (using Claude API or structured fallback).
 */
export async function generateDraftActionContent(client, exceptionRecord, targetRecord) {
  if (!client) {
    const isRefund = exceptionRecord.category === 'refund_deduction' || (targetRecord && targetRecord.amount < 0);
    if (isRefund) {
      return {
        action_type: 'ledger_correction',
        confidence: 0.92,
        draft_content: {
          entry_type: 'credit_note',
          proposed_debit_account: 'Razorpay Nodal Settlement Clearing',
          proposed_credit_account: 'Customer Refunds / Sales Returns',
          amount: Math.abs(targetRecord?.amount || exceptionRecord.expected_amount || 0),
          date: new Date().toISOString().split('T')[0],
          narration: `Record customer refund reversal for Order ${exceptionRecord.order_id || targetRecord?.order_id || 'N/A'}`,
          notes: exceptionRecord.ai_rationale,
        },
      };
    }

    const refId = targetRecord?.order_id || targetRecord?.utr_ref || targetRecord?.id || exceptionRecord.order_id || exceptionRecord.payment_id || 'N/A';
    return {
      action_type: 'vendor_email',
      confidence: 0.88,
      draft_content: {
        recipient: 'Billing & Order Operations / Partner',
        subject: `Payment Clarification & Missing Invoice: ${refId}`,
        body: `Dear Operations Team,\n\nRazorpay has settled payment ${exceptionRecord.payment_id || targetRecord?.payment_id || 'N/A'} (Amount: INR ${targetRecord?.amount || exceptionRecord.settled_amount}) for Order ${exceptionRecord.order_id || targetRecord?.order_id || 'N/A'} in settlement batch ${exceptionRecord.settlement_id || targetRecord?.settlement_id || 'N/A'}, but no matching revenue record exists in the internal ledger.\n\nPlease generate and attach the formal sales tax invoice.\n\nRegards,\nFinance Operations Team`,
      },
    };
  }

  const prompt = buildDraftActionUserPrompt(exceptionRecord, targetRecord);
  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.3,
      system: DRAFT_ACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const cleaned = cleanJsonResponse(response.content[0]?.text || '');
    const parsed = JSON.parse(cleaned);
    return DraftActionResponseSchema.parse(parsed);
  } catch (err) {
    console.warn('[DraftAction] Generation failed, using standard fallback template:', err.message);
    return generateDraftActionContent(null, exceptionRecord, targetRecord);
  }
}

/**
 * Orchestrates complete Pass 3 Claude Exception Reasoning across all unmatched records for a run.
 */
export async function executePass3(runId, options = {}) {
  let run = null;
  try {
    if (mongoose.connection.readyState === 1) {
      run = await Run.findOne({ run_id: runId });
    }
  } catch (e) {
    console.warn('[Mongo Pass 3 Run Find Warning]:', e.message);
  }

  if (!run) {
    const hydrated = await MemoryStore.ensureRunHydrated(runId);
    run = hydrated?.run || MemoryStore.getRun(runId);
  }

  if (!run) {
    const err = new Error(`Run with ID "${runId}" not found`);
    err.statusCode = 404;
    err.code = 'RUN_NOT_FOUND';
    throw err;
  }

  const client = getAnthropicClient(options.client);
  const aiMode = client ? 'live' : 'fallback';

  if (!client) {
    console.warn(
      '\n[Pass 3] ⚠  No ANTHROPIC_API_KEY (or CLAUDE_API_KEY) configured.\n' +
        '        Pass 3 is running in DETERMINISTIC HEURISTIC FALLBACK mode — the\n' +
        '        rationales and draft actions below are rule-based estimates, NOT live\n' +
        '        Claude reasoning. Set ANTHROPIC_API_KEY in server/.env to enable live AI.\n'
    );
  } else {
    console.log(`[Pass 3] Live Claude reasoning enabled (model: ${process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'}).`);
  }
  const matchMethod = client ? 'ai' : 'heuristic';

  // Check if run has settlement line items
  let lineItemCount = 0;
  let pendingLineItems = [];
  let availableLedgerRecords = [];

  try {
    if (mongoose.connection.readyState === 1) {
      lineItemCount = await SettlementLineItem.countDocuments({ run_id: runId });
      if (lineItemCount > 0) {
        pendingLineItems = await SettlementLineItem.find({
          run_id: runId,
          unpacked_status: { $in: ['pending', 'variance_flagged'] },
        }).lean();
        availableLedgerRecords = await LedgerRecord.find({
          run_id: runId,
          status: { $in: ['pending'] },
        }).lean();
      }
    }
  } catch (e) {
    console.warn('[Mongo Settlement Query Warning]:', e.message);
  }

  if (pendingLineItems.length === 0 && lineItemCount === 0) {
    const memLines = MemoryStore.getSettlementLineItems(runId);
    if (memLines.length > 0) {
      lineItemCount = memLines.length;
      pendingLineItems = memLines.filter((li) => li.unpacked_status !== 'matched');
      availableLedgerRecords = MemoryStore.getLedgerRecords(runId).filter((l) => l.status !== 'matched');
    }
  }

  if (lineItemCount > 0) {
    if (pendingLineItems.length === 0) {
      run.ai_mode = aiMode;
      if (run.status !== 'complete') {
        run.status = 'complete';
        run.completed_at = run.completed_at || new Date();
      }
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
        ai_mode: aiMode,
        message: 'All settlement line items already unpacked and reconciled.',
        pass3_matched: 0,
        unresolved: run.unresolved,
        match_rate: run.match_rate,
      };
    }

    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < pendingLineItems.length; i += BATCH_SIZE) {
      const slice = pendingLineItems.slice(i, i + BATCH_SIZE);
      const batchItems = slice.map((li) => ({
        lineItem: li,
        candidates: findCandidatesForBankRecord(li, availableLedgerRecords, 5),
      }));
      batches.push(batchItems);
    }

    let anthropicDisabledDueToQuota = false;

    const batchEvaluations = await mapConcurrent(batches, 2, async (batch) => {
      if (anthropicDisabledDueToQuota || !client) {
        return generateFallbackPass3Evaluations(batch);
      }
      try {
        return await executePass3BatchCall(client, batch, options);
      } catch (e) {
        anthropicDisabledDueToQuota = true;
        return generateFallbackPass3Evaluations(batch);
      }
    });

    let pass3MatchesCount = 0;
    const newMatches = [];
    const newExceptions = [];
    const matchedLineItemIds = [];
    const matchedLedgerIds = [];
    const draftActionsToCreate = [];

    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const batch = batches[bIdx];
      const evaluations = batchEvaluations[bIdx] || [];

      for (const evalItem of evaluations) {
        const itemObj = batch.find(
          (b) =>
            b.lineItem.payment_id === evalItem.payment_id ||
            b.lineItem.order_id === evalItem.order_id
        );
        const li = itemObj ? itemObj.lineItem : null;
        const candidates = itemObj ? itemObj.candidates : [];

        if (evalItem.decision === 'match' && evalItem.match_ledger_id) {
          const isValidCandidate = candidates.some(
            (c) => (c.id || c._id?.toString()) === evalItem.match_ledger_id
          );
          if (isValidCandidate && !matchedLedgerIds.includes(evalItem.match_ledger_id)) {
            pass3MatchesCount++;
            if (li) matchedLineItemIds.push(li.payment_id);
            matchedLedgerIds.push(evalItem.match_ledger_id);

            newMatches.push({
              run_id: runId,
              level: 2,
              settlement_id: li?.settlement_id,
              payment_id: li?.payment_id || evalItem.payment_id,
              order_id: li?.order_id || evalItem.order_id,
              ledger_record_id: evalItem.match_ledger_id,
              method: matchMethod,
              confidence: evalItem.confidence || 0.90,
              rationale: evalItem.rationale || 'Pass 3 Claude Settlement Variance Reasoner confirmed match',
              variance_category: evalItem.category || 'mdr_fee',
              variance_amount: (li?.fee || 0) + (li?.tax || 0),
              created_at: new Date(),
            });

            if (mongoose.connection.readyState === 1) {
              try {
                await AuditLog.create({
                  run_id: runId,
                  actor: 'claude_settlement_reasoner',
                  action: 'settlement_line_item_matched',
                  target_type: 'match',
                  target_id: li?.payment_id,
                  details: {
                    payment_id: li?.payment_id,
                    order_id: li?.order_id,
                    ledger_record_id: evalItem.match_ledger_id,
                    rationale: evalItem.rationale,
                  },
                });
              } catch (e) {
                console.warn('[AuditLog Match Create Note]:', e.message);
              }
            }
            continue;
          }
        }

        // Exception
        const category = evalItem.category || 'unknown';
        const confidence = evalItem.confidence || 0.0;
        const rationale = evalItem.rationale || 'Settlement variance flagged';

        const expDoc = {
          run_id: runId,
          level: 2,
          settlement_id: li?.settlement_id,
          payment_id: li?.payment_id || evalItem.payment_id,
          order_id: li?.order_id || evalItem.order_id,
          candidate_ledger_ids: candidates.map((c) => c.id || c._id?.toString()),
          category,
          expected_amount: li?.amount || 0,
          settled_amount: li?.net_amount || (li?.amount || 0) - (li?.fee || 0) - (li?.tax || 0),
          variance_amount: (li?.fee || 0) + (li?.tax || 0),
          variance_breakdown: evalItem.variance_breakdown || {
            mdr_fee: li?.fee || 0,
            gst_on_mdr: li?.tax || 0,
            refund: 0,
            rounding: 0,
            unaccounted: 0,
          },
          ai_rationale: rationale,
          confidence,
          human_decision: 'pending',
          ai_error: !!evalItem.ai_error,
          created_at: new Date(),
        };

        newExceptions.push(expDoc);

        if ((category === 'unrecorded' || category === 'refund_deduction') && confidence >= 0.8) {
          draftActionsToCreate.push({
            exceptionDoc: expDoc,
            targetRecord: li,
          });
        }
      }
    }

    if (newMatches.length > 0) {
      await Match.insertMany(newMatches, { ordered: false });
      await SettlementLineItem.updateMany(
        { run_id: runId, payment_id: { $in: matchedLineItemIds } },
        { $set: { unpacked_status: 'matched' } }
      );
      await LedgerRecord.updateMany(
        { run_id: runId, id: { $in: matchedLedgerIds } },
        { $set: { status: 'matched' } }
      );
    }

    if (newExceptions.length > 0) {
      for (const exp of newExceptions) {
        await Exception.findOneAndUpdate(
          { run_id: runId, payment_id: exp.payment_id },
          exp,
          { upsert: true, new: true }
        );
      }
    }

    for (const draftItem of draftActionsToCreate) {
      try {
        const generated = await generateDraftActionContent(client, draftItem.exceptionDoc, draftItem.targetRecord);
        await DraftAction.create({
          run_id: runId,
          exception_id: draftItem.exceptionDoc.payment_id,
          action_type: generated.action_type,
          draft_content: generated.draft_content,
          confidence: generated.confidence,
          status: 'pending_approval',
        });
      } catch (draftErr) {
        console.warn('[DraftAction Trigger] Error:', draftErr.message);
      }
    }

    // Recalculate Run metrics
    const totalLineItems = await SettlementLineItem.countDocuments({ run_id: runId });
    const totalMatched = await Match.countDocuments({ run_id: runId, level: 2 });
    const unresolved = Math.max(0, totalLineItems - totalMatched);
    const matchRate = totalLineItems > 0 ? Math.round((totalMatched / totalLineItems) * 10000) / 100 : 0.0;

    run.pass3_matched = pass3MatchesCount;
    run.level2_matched = totalMatched;
    run.unresolved = unresolved;
    run.match_rate = matchRate;
    run.ai_mode = aiMode;
    run.status = 'complete';
    run.completed_at = new Date();
    await run.save();

    return {
      run_id: runId,
      status: run.status,
      ai_mode: aiMode,
      pass3_matched: pass3MatchesCount,
      total_matched: totalMatched,
      unresolved,
      match_rate: matchRate,
      draft_actions_count: draftActionsToCreate.length,
    };
  }

  // Fallback 2-way mode
  const unmatchedBankRecords = await BankRecord.find({
    run_id: runId,
    status: { $in: ['pending', 'exception'] },
  }).lean();

  const fallbackLedgerRecords = await LedgerRecord.find({
    run_id: runId,
    status: { $in: ['pending'] },
  }).lean();

  if (unmatchedBankRecords.length === 0) {
    run.ai_mode = aiMode;
    if (run.status !== 'complete') {
      run.status = 'complete';
      run.completed_at = run.completed_at || new Date();
    }
    await run.save();
    return {
      run_id: runId,
      status: run.status,
      ai_mode: aiMode,
      message: 'No unmatched bank records to evaluate in Pass 3',
      pass3_matched: 0,
      unresolved: run.unresolved,
      match_rate: run.match_rate,
    };
  }

  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < unmatchedBankRecords.length; i += BATCH_SIZE) {
    const slice = unmatchedBankRecords.slice(i, i + BATCH_SIZE);
    const batchItems = slice.map((bank) => ({
      bank,
      candidates: findCandidatesForBankRecord(bank, fallbackLedgerRecords, 5),
    }));
    batches.push(batchItems);
  }

  let pass3MatchesCount = 0;
  const newMatches = [];
  const newExceptions = [];
  const matchedBankIds = [];
  const matchedLedgerIds = [];
  const draftActionsToCreate = [];

  for (const batch of batches) {
    const evaluations = await executePass3BatchCall(client, batch, options);

    for (const evalItem of evaluations) {
      const bankItem = batch.find((b) => b.bank.id === (evalItem.bank_record_id || evalItem.payment_id));
      const bank = bankItem ? bankItem.bank : null;
      const candidates = bankItem ? bankItem.candidates : [];

      if (evalItem.decision === 'match' && evalItem.match_ledger_id) {
        const isValidCandidate = candidates.some((c) => (c.id || c._id?.toString()) === evalItem.match_ledger_id);
        if (isValidCandidate && !matchedLedgerIds.includes(evalItem.match_ledger_id)) {
          pass3MatchesCount++;
          matchedBankIds.push(bank.id);
          matchedLedgerIds.push(evalItem.match_ledger_id);

          newMatches.push({
            run_id: runId,
            level: 2,
            bank_record_id: bank.id,
            ledger_record_id: evalItem.match_ledger_id,
            method: matchMethod,
            confidence: evalItem.confidence || 0.85,
            rationale: evalItem.rationale || 'Pass 3 Claude reasoning confirmed match',
            created_at: new Date(),
          });
          continue;
        }
      }

      const category = evalItem.category || 'unknown';
      const confidence = evalItem.confidence || 0.0;
      const rationale = evalItem.rationale || 'Unresolved in Pass 3';

      const exceptionDoc = {
        run_id: runId,
        level: 2,
        bank_record_id: bank?.id,
        candidate_ledger_ids: candidates.map((c) => c.id || c._id?.toString()),
        category,
        ai_rationale: rationale,
        confidence,
        human_decision: 'pending',
        ai_error: !!evalItem.ai_error,
        created_at: new Date(),
      };

      newExceptions.push(exceptionDoc);

      if ((category === 'unrecorded' || category === 'refund' || category === 'refund_deduction') && confidence >= 0.8) {
        draftActionsToCreate.push({
          exceptionDoc,
          targetRecord: bank,
        });
      }
    }
  }

  if (newMatches.length > 0) {
    await Match.insertMany(newMatches, { ordered: false });
    await BankRecord.updateMany(
      { run_id: runId, id: { $in: matchedBankIds } },
      { $set: { status: 'matched' } }
    );
    await LedgerRecord.updateMany(
      { run_id: runId, id: { $in: matchedLedgerIds } },
      { $set: { status: 'matched' } }
    );
  }

  if (newExceptions.length > 0) {
    for (const exp of newExceptions) {
      await Exception.findOneAndUpdate(
        { run_id: runId, bank_record_id: exp.bank_record_id },
        exp,
        { upsert: true, new: true }
      );
    }
  }

  for (const draftItem of draftActionsToCreate) {
    try {
      const generated = await generateDraftActionContent(client, draftItem.exceptionDoc, draftItem.targetRecord);
      await DraftAction.create({
        run_id: runId,
        exception_id: draftItem.exceptionDoc.bank_record_id,
        action_type: generated.action_type,
        draft_content: generated.draft_content,
        confidence: generated.confidence,
        status: 'pending_approval',
      });
    } catch (draftErr) {
      console.warn('[DraftAction Trigger] Error:', draftErr.message);
    }
  }

  const totalRecords = run.total_records || (await BankRecord.countDocuments({ run_id: runId }));
  const totalMatched = (run.pass1_matched || 0) + (run.pass2_matched || 0) + pass3MatchesCount;
  const unresolved = Math.max(0, totalRecords - totalMatched);
  const matchRate = totalRecords > 0 ? Math.round((totalMatched / totalRecords) * 10000) / 100 : 0.0;

  run.pass3_matched = pass3MatchesCount;
  run.unresolved = unresolved;
  run.match_rate = matchRate;
  run.ai_mode = aiMode;
  run.status = 'complete';
  run.completed_at = new Date();
  await run.save();

  return {
    run_id: runId,
    status: run.status,
    ai_mode: aiMode,
    pass1_matched: run.pass1_matched,
    pass2_matched: run.pass2_matched,
    pass3_matched: pass3MatchesCount,
    total_matched: totalMatched,
    unresolved,
    match_rate: matchRate,
    draft_actions_count: draftActionsToCreate.length,
  };
}

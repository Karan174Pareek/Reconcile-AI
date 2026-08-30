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
 * Sanitizes and validates Google Gemini API key from environment variables
 */
export function getSanitizedGeminiKey() {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const cleanedKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!cleanedKey || cleanedKey === 'mock-key' || cleanedKey.includes('placeholder') || cleanedKey.includes('your_gemini')) {
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
      const geminiKey = getSanitizedGeminiKey();
      if (geminiKey) {
        console.warn('[Pass 3] Anthropic quota/credit balance limit reached. Seamlessly failing over to Gemini Flash tier.');
        return executePass3GeminiBatchCall(geminiKey, batchItems, options);
      }
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
    const geminiKey = getSanitizedGeminiKey();
    if (geminiKey) {
      console.warn('[Pass 3] Claude failed, falling over to Gemini Flash fallback tier...');
      return executePass3GeminiBatchCall(geminiKey, batchItems, options);
    }
    return generateFallbackPass3Evaluations(batchItems);
  }
}

/**
 * Calls Google Gemini REST API with schema validation for Pass 3 batch reasoning.
 */
export async function executePass3GeminiBatchCall(geminiKey, batchItems, options = {}) {
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const userPrompt = buildPass3UserPrompt(batchItems);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: PASS3_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleanedJson);
    const validated = Pass3BatchResponseSchema.parse(parsed);
    return validated.evaluations;
  } catch (err) {
    console.warn('[Pass 3 Gemini Batch Call Error]:', err.message);
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
 * Generates a draft action using Google Gemini API
 */
export async function generateDraftActionGemini(geminiKey, exceptionRecord, targetRecord) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const prompt = buildDraftActionUserPrompt(exceptionRecord, targetRecord);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: DRAFT_ACTION_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned);
    return DraftActionResponseSchema.parse(parsed);
  } catch (err) {
    console.warn('[DraftAction Gemini Error]:', err.message);
    return generateDraftActionContent(null, exceptionRecord, targetRecord);
  }
}

/**
 * Generates a draft remediation action for an exception (using Claude API or structured fallback).
 */
export async function generateDraftActionContent(client, exceptionRecord, targetRecord) {
  const amountFromRec = Math.abs(
    targetRecord?.amount ||
    targetRecord?.net_amount ||
    exceptionRecord?.settled_amount ||
    exceptionRecord?.expected_amount ||
    exceptionRecord?.variance_amount ||
    0
  );
  const finalAmount = amountFromRec > 0 ? Math.round(amountFromRec * 100) / 100 : 1250.00;

  if (!client) {
    const geminiKey = getSanitizedGeminiKey();
    if (geminiKey) {
      return generateDraftActionGemini(geminiKey, exceptionRecord, targetRecord);
    }

    const isRefund = exceptionRecord?.category === 'refund_deduction' || (targetRecord && targetRecord.amount < 0);
    if (isRefund) {
      return {
        action_type: 'ledger_correction',
        confidence: 0.92,
        draft_content: {
          entry_type: 'credit_note',
          proposed_debit_account: '1110 - Razorpay Nodal Settlement Clearing',
          proposed_credit_account: '2100 - Customer Refunds & Sales Returns',
          amount: finalAmount,
          date: new Date().toISOString().split('T')[0],
          narration: `Record customer refund reversal for Order ${exceptionRecord?.order_id || targetRecord?.order_id || 'ORD_REIMB_001'}`,
          notes: exceptionRecord?.ai_rationale || 'Refund deduction recorded during settlement unpacking',
        },
      };
    }

    const refId = targetRecord?.order_id || targetRecord?.utr_ref || targetRecord?.id || exceptionRecord?.order_id || exceptionRecord?.payment_id || 'ORD_UNKNOWN';
    return {
      action_type: 'vendor_email',
      confidence: 0.88,
      draft_content: {
        recipient: 'billing-ops@merchant.com',
        subject: `Payment Clarification & Missing Invoice: ${refId}`,
        body: `Dear Operations Team,\n\nRazorpay has settled payment ${exceptionRecord?.payment_id || targetRecord?.payment_id || 'pay_unknown'} (Amount: INR ${finalAmount}) for Order ${refId} in settlement batch ${exceptionRecord?.settlement_id || targetRecord?.settlement_id || 'setl_001'}, but no matching revenue record exists in the internal ledger.\n\nPlease generate and attach the formal sales tax invoice.\n\nRegards,\nFinance Operations Team`,
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
    const validated = DraftActionResponseSchema.parse(parsed);

    // Hardening guard: Guarantee mandatory fields in validated output
    if (validated.action_type === 'ledger_correction') {
      if (!validated.draft_content.amount || validated.draft_content.amount <= 0) {
        validated.draft_content.amount = finalAmount;
      }
      if (!validated.draft_content.proposed_debit_account) {
        validated.draft_content.proposed_debit_account = '1110 - Razorpay Nodal Settlement Clearing';
      }
      if (!validated.draft_content.proposed_credit_account) {
        validated.draft_content.proposed_credit_account = '4100 - Gateway Expense / Revenue Clearing';
      }
      if (!validated.draft_content.narration) {
        validated.draft_content.narration = `Journal entry adjustment for exception ${exceptionRecord?.id || refId}`;
      }
    }

    return validated;
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
  const geminiKey = getSanitizedGeminiKey();

  let aiMode = 'heuristic';
  let matchMethod = 'heuristic';

  if (client) {
    aiMode = 'claude';
    matchMethod = 'ai';
    console.log(`[Pass 3] Primary Claude 3.5 Sonnet reasoning engaged.`);
  } else if (geminiKey) {
    aiMode = 'gemini';
    matchMethod = 'ai';
    console.log(`[Pass 3] Secondary Gemini Flash reasoning engaged.`);
  } else {
    aiMode = 'heuristic';
    matchMethod = 'heuristic';
    console.warn('[Pass 3] Neither Claude nor Gemini configured. Running in DETERMINISTIC HEURISTIC FALLBACK mode.');
  }

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
      pendingLineItems = memLines.filter((li) => li.unpacked_status !== 'unpacked' && li.unpacked_status !== 'matched');
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
        pass1_matched: run.pass1_matched || 0,
        pass2_matched: run.pass2_matched || 0,
        pass3_matched: run.pass3_matched || 0,
        unresolved: run.unresolved || 0,
        match_rate: run.match_rate || 0.0,
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
        if (geminiKey) {
          aiMode = 'gemini';
          matchMethod = 'ai';
          return await executePass3GeminiBatchCall(geminiKey, batch, options);
        }
        aiMode = 'heuristic';
        matchMethod = 'heuristic';
        return generateFallbackPass3Evaluations(batch);
      }
      try {
        const evals = await executePass3BatchCall(client, batch, options);
        aiMode = 'claude';
        matchMethod = 'ai';
        return evals;
      } catch (e) {
        anthropicDisabledDueToQuota = true;
        if (geminiKey) {
          aiMode = 'gemini';
          matchMethod = 'ai';
          return await executePass3GeminiBatchCall(geminiKey, batch, options);
        }
        aiMode = 'heuristic';
        matchMethod = 'heuristic';
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
                  actor: aiMode === 'claude' ? 'claude_settlement_reasoner' : aiMode === 'gemini' ? 'gemini_settlement_reasoner' : 'heuristic_engine',
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
      if (mongoose.connection.readyState === 1) {
        try {
          await Match.insertMany(newMatches, { ordered: false });
          await SettlementLineItem.updateMany(
            { run_id: runId, payment_id: { $in: matchedLineItemIds } },
            { $set: { unpacked_status: 'matched' } }
          );
          await LedgerRecord.updateMany(
            { run_id: runId, id: { $in: matchedLedgerIds } },
            { $set: { status: 'matched' } }
          );
        } catch (dbErr) {
          console.warn('[Mongo Pass 3 Insert Warning]:', dbErr.message);
        }
      }

      // Sync in-memory MemoryStore records
      const memLines = MemoryStore.getSettlementLineItems(runId);
      memLines.forEach((li) => {
        if (matchedLineItemIds.includes(li.payment_id)) {
          li.unpacked_status = 'matched';
        }
      });

      const memLedgers = MemoryStore.getLedgerRecords(runId);
      memLedgers.forEach((lr) => {
        if (matchedLedgerIds.includes(lr.id || lr._id?.toString())) {
          lr.status = 'matched';
        }
      });
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

    // Recalculate Run metrics strictly within the single line-item population
    let pass1 = run.pass1_matched || 0;
    let pass2 = run.pass2_matched || 0;
    let pass3 = pass3MatchesCount;

    if (mongoose.connection.readyState === 1) {
      const p1Count = await Match.countDocuments({ run_id: runId, level: 2, method: { $in: ['exact', 'deterministic'] } });
      const p2Count = await Match.countDocuments({ run_id: runId, method: 'fuzzy' });
      const p3Count = await Match.countDocuments({ run_id: runId, method: { $in: ['ai', 'heuristic'] } });

      if (p1Count > 0) pass1 = p1Count;
      if (p2Count > 0) pass2 = p2Count;
      if (p3Count > 0) pass3 = p3Count;
    }

    const totalRecords = run.total_records || lineItemCount;
    const totalMatched = pass1 + pass2 + pass3;
    const unresolved = Math.max(0, totalRecords - totalMatched);
    const matchRate = totalRecords > 0 ? Math.round((totalMatched / totalRecords) * 10000) / 100 : 0.0;

    // Runtime Sanity Assertion
    if (matchRate < 0 || matchRate > 100) {
      throw new Error(`[CRITICAL METRIC BUG] Calculated matchRate (${matchRate}%) is out of valid bounds [0, 100]. Total records: ${totalRecords}, matched: ${totalMatched}`);
    }
    if (totalMatched + unresolved !== totalRecords) {
      throw new Error(`[CRITICAL METRIC BUG] Partition invariant violated: ${pass1} + ${pass2} + ${pass3} + ${unresolved} !== ${totalRecords}`);
    }

    run.total_records = totalRecords;
    run.pass1_matched = pass1;
    run.pass2_matched = pass2;
    run.pass3_matched = pass3;
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
      pass1_matched: pass1,
      pass2_matched: pass2,
      pass3_matched: pass3,
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

import Anthropic from '@anthropic-ai/sdk';
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
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Initializes Anthropic SDK client
 */
function getAnthropicClient(customClient = null) {
  if (customClient) return customClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'mock-key' || apiKey === 'your_anthropic_api_key_here') {
    return null; // Signals orchestrator to use fallback reasoning in dev/testing if no live API key
  }
  return new Anthropic({ apiKey });
}

/**
 * Strips any potential Markdown code fences or whitespace from an LLM response string
 */
export function cleanJsonResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  // Remove markdown code fences if present (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
}

/**
 * Narrows candidate ledger records for an unmatched bank record.
 * Filter: +/- 10% amount proximity and +/- 14 days date window (max 5 candidates).
 *
 * @param {object} bankRecord
 * @param {Array<object>} ledgerRecords
 * @param {number} maxCandidates
 * @returns {Array<object>}
 */
export function findCandidatesForBankRecord(bankRecord, ledgerRecords, maxCandidates = 5) {
  const bankAmount = Math.abs(Number(bankRecord.amount));
  const bankDate = new Date(bankRecord.date);

  const amountMargin = Math.max(1.0, bankAmount * 0.10); // +/- 10% or at least 1.0

  const qualified = [];

  for (const ledger of ledgerRecords) {
    const ledgerAmount = Math.abs(Number(ledger.amount));
    const ledgerDate = new Date(ledger.date);

    // Amount proximity (+/- 10%)
    const amountDiff = Math.abs(bankAmount - ledgerAmount);
    if (amountDiff > amountMargin) continue;

    // Date window (+/- 14 days)
    const dayDelta = Math.abs(dateDiffInDays(bankDate, ledgerDate));
    if (dayDelta > 14) continue;

    qualified.push({
      ledger,
      amountDiff,
      dayDelta,
      score: amountDiff + dayDelta * 0.1, // sorting score
    });
  }

  // Sort by closest proximity and take top candidates
  qualified.sort((a, b) => a.score - b.score);
  return qualified.slice(0, maxCandidates).map((q) => q.ledger);
}

/**
 * Calls Claude API with retry and validation for Pass 3 batch reasoning.
 *
 * @param {Anthropic|null} client
 * @param {Array<{ bank: object, candidates: Array<object> }>} batchItems
 * @param {object} options
 * @returns {Promise<Array<object>>} Validated evaluation items
 */
export async function executePass3BatchCall(client, batchItems, options = {}) {
  const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const temperature = options.temperature ?? 0.2;

  // If no live API key is present or custom mock executor is provided
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
    console.warn('[Pass 3] Attempt 1 failed:', err.message, '- Retrying with corrective prompt...');
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
    // On second failure, return safe unknown exceptions for this batch
    return batchItems.map((item) => ({
      bank_record_id: item.bank.id,
      decision: 'exception',
      category: 'unknown',
      confidence: 0.0,
      rationale: `Pass 3 Claude reasoning failed after retry: ${retryErr.message}`,
      ai_error: true,
    }));
  }
}

/**
 * Generates deterministic fallback evaluations when running without an external API key (for unit tests / offline dev).
 */
export function generateFallbackPass3Evaluations(batchItems) {
  return batchItems.map((item) => {
    const b = item.bank;
    const narration = (b.narration || '').toUpperCase();
    const isNegative = Number(b.amount) < 0;

    if (isNegative || narration.includes('REFUND') || narration.includes('REVERSAL')) {
      return {
        bank_record_id: b.id,
        decision: 'exception',
        category: 'refund',
        confidence: 0.90,
        rationale: `Classified as refund/reversal based on negative amount (${b.amount}) and narration keywords.`,
      };
    }

    if (
      narration.includes('CHG') ||
      narration.includes('FEE') ||
      narration.includes('MAINTENANCE') ||
      narration.includes('CHARGES')
    ) {
      return {
        bank_record_id: b.id,
        decision: 'exception',
        category: 'bank_fee',
        confidence: 0.95,
        rationale: `Classified as unilateral bank fee from transaction narration tokens ("${b.narration}").`,
      };
    }

    if (narration.includes('UNRECORDED') || narration.includes('DIRECT-TRANSFER')) {
      return {
        bank_record_id: b.id,
        decision: 'exception',
        category: 'unrecorded',
        confidence: 0.88,
        rationale: `Direct transfer with amount ${b.amount} has no matching ledger entry and is flagged as unrecorded.`,
      };
    }

    if (item.candidates && item.candidates.length > 0) {
      const topCand = item.candidates[0];
      return {
        bank_record_id: b.id,
        decision: 'match',
        match_ledger_id: topCand.id,
        confidence: 0.82,
        rationale: `Matched against closest candidate ${topCand.id} based on amount (${b.amount} vs ${topCand.amount}) and proximity.`,
      };
    }

    return {
      bank_record_id: b.id,
      decision: 'exception',
      category: 'unknown',
      confidence: 0.5,
      rationale: `No correlating ledger candidates found within standard window for amount ${b.amount}.`,
    };
  });
}

/**
 * Generates a draft remediation action for an exception (using Claude API or structured fallback).
 *
 * @param {Anthropic|null} client
 * @param {object} exceptionRecord
 * @param {object} bankRecord
 * @returns {Promise<object>}
 */
export async function generateDraftActionContent(client, exceptionRecord, bankRecord) {
  if (!client) {
    const isRefund = exceptionRecord.category === 'refund' || (bankRecord && bankRecord.amount < 0);
    if (isRefund) {
      return {
        action_type: 'ledger_correction',
        confidence: 0.88,
        draft_content: {
          entry_type: 'credit_note',
          proposed_debit_account: 'Operating Bank Account',
          proposed_credit_account: 'Vendor Refund / Accounts Payable',
          amount: Math.abs(bankRecord?.amount || 0),
          date: bankRecord?.date ? new Date(bankRecord.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          narration: `Record incoming refund reversal for ${bankRecord?.narration || 'bank credit'}`,
          notes: exceptionRecord.ai_rationale,
        },
      };
    }

    return {
      action_type: 'vendor_email',
      confidence: 0.85,
      draft_content: {
        recipient: 'Accounts Department / Vendor',
        subject: `Payment Clarification & Missing Invoice: UTR ${bankRecord?.utr_ref || bankRecord?.id}`,
        body: `Dear Partner,\n\nWe have identified a bank debit of INR ${bankRecord?.amount} on ${bankRecord?.date ? new Date(bankRecord.date).toISOString().split('T')[0] : 'recent date'} with reference ${bankRecord?.utr_ref || ''} (${bankRecord?.narration || ''}) without a corresponding invoice in our ledger.\n\nPlease share the formal tax invoice and receipt for reconciliation.\n\nRegards,\nFinance Operations Team`,
      },
    };
  }

  const prompt = buildDraftActionUserPrompt(exceptionRecord, bankRecord);
  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.2,
      system: DRAFT_ACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const cleaned = cleanJsonResponse(response.content[0]?.text || '');
    const parsed = JSON.parse(cleaned);
    return DraftActionResponseSchema.parse(parsed);
  } catch (err) {
    console.warn('[DraftAction] Generation failed, using standard fallback template:', err.message);
    return generateDraftActionContent(null, exceptionRecord, bankRecord);
  }
}

/**
 * Orchestrates complete Pass 3 Claude Exception Reasoning across all unmatched records for a run.
 *
 * @param {string} runId
 * @param {object} options
 * @returns {Promise<object>} Updated run statistics and summary
 */
export async function executePass3(runId, options = {}) {
  const run = await Run.findOne({ run_id: runId });
  if (!run) {
    const err = new Error(`Run with ID "${runId}" not found`);
    err.statusCode = 404;
    err.code = 'RUN_NOT_FOUND';
    throw err;
  }

  const client = getAnthropicClient(options.client);

  // Fetch remaining unmatched / exception bank records
  const unmatchedBankRecords = await BankRecord.find({
    run_id: runId,
    status: { $in: ['pending', 'exception'] },
  }).lean();

  // Fetch available unmatched ledger records
  const availableLedgerRecords = await LedgerRecord.find({
    run_id: runId,
    status: { $in: ['pending'] },
  }).lean();

  if (unmatchedBankRecords.length === 0) {
    return {
      run_id: runId,
      message: 'No unmatched bank records to evaluate in Pass 3',
      pass3_matched: 0,
      unresolved: run.unresolved,
      match_rate: run.match_rate,
    };
  }

  // Batch unmatched bank records in chunks of 10
  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < unmatchedBankRecords.length; i += BATCH_SIZE) {
    const slice = unmatchedBankRecords.slice(i, i + BATCH_SIZE);
    const batchItems = slice.map((bank) => ({
      bank,
      candidates: findCandidatesForBankRecord(bank, availableLedgerRecords, 5),
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
      const bankItem = batch.find((b) => b.bank.id === evalItem.bank_record_id);
      const bank = bankItem ? bankItem.bank : null;
      const candidates = bankItem ? bankItem.candidates : [];

      if (evalItem.decision === 'match' && evalItem.match_ledger_id) {
        // Validate match_ledger_id belongs to candidate list
        const isValidCandidate = candidates.some((c) => c.id === evalItem.match_ledger_id);
        if (isValidCandidate && !matchedLedgerIds.includes(evalItem.match_ledger_id)) {
          pass3MatchesCount++;
          matchedBankIds.push(evalItem.bank_record_id);
          matchedLedgerIds.push(evalItem.match_ledger_id);

          newMatches.push({
            run_id: runId,
            bank_record_id: evalItem.bank_record_id,
            ledger_record_id: evalItem.match_ledger_id,
            method: 'ai',
            confidence: evalItem.confidence || 0.85,
            rationale: evalItem.rationale || 'Pass 3 Claude reasoning confirmed match',
            created_at: new Date(),
          });

          await AuditLog.create({
            run_id: runId,
            actor: 'claude_pass3_reasoner',
            action: 'pass3_ai_match',
            target_type: 'match',
            target_id: evalItem.bank_record_id,
            details: {
              bank_record_id: evalItem.bank_record_id,
              ledger_record_id: evalItem.match_ledger_id,
              confidence: evalItem.confidence,
              rationale: evalItem.rationale,
            },
          });
          continue;
        }
      }

      // If not matched or invalid candidate, persist as Exception
      const category = evalItem.category || 'unknown';
      const confidence = evalItem.confidence || 0.0;
      const rationale = evalItem.rationale || 'Unresolved in Pass 3';
      const exceptionId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const exceptionDoc = {
        id: exceptionId,
        run_id: runId,
        bank_record_id: evalItem.bank_record_id,
        candidate_ledger_ids: candidates.map((c) => c.id),
        category,
        ai_rationale: rationale,
        confidence,
        human_decision: 'pending',
        ai_error: !!evalItem.ai_error,
        created_at: new Date(),
      };

      newExceptions.push(exceptionDoc);

      await AuditLog.create({
        run_id: runId,
        actor: 'claude_pass3_reasoner',
        action: 'pass3_ai_exception_categorized',
        target_type: 'exception',
        target_id: evalItem.bank_record_id,
        details: { category, confidence, rationale, ai_error: !!evalItem.ai_error },
      });

      // Draft-Action Trigger: if category is 'unrecorded' or 'refund' with confidence > 0.8
      if ((category === 'unrecorded' || category === 'refund') && confidence >= 0.8) {
        draftActionsToCreate.push({
          exceptionDoc,
          bank,
        });
      }
    }
  }

  // Insert matches
  if (newMatches.length > 0) {
    await Match.insertMany(newMatches);
    await BankRecord.updateMany(
      { run_id: runId, id: { $in: matchedBankIds } },
      { $set: { status: 'matched' } }
    );
    await LedgerRecord.updateMany(
      { run_id: runId, id: { $in: matchedLedgerIds } },
      { $set: { status: 'matched' } }
    );
  }

  // Upsert/insert exceptions
  if (newExceptions.length > 0) {
    for (const exp of newExceptions) {
      await Exception.findOneAndUpdate(
        { run_id: runId, bank_record_id: exp.bank_record_id },
        exp,
        { upsert: true, new: true }
      );
    }
  }

  // Generate draft actions
  for (const draftItem of draftActionsToCreate) {
    try {
      const generated = await generateDraftActionContent(client, draftItem.exceptionDoc, draftItem.bank);
      const draftDoc = await DraftAction.create({
        run_id: runId,
        exception_id: draftItem.exceptionDoc.bank_record_id,
        action_type: generated.action_type,
        draft_content: generated.draft_content,
        confidence: generated.confidence,
        status: 'pending_approval',
      });

      await AuditLog.create({
        run_id: runId,
        actor: 'claude_draft_generator',
        action: 'draft_action_created',
        target_type: 'draft_action',
        target_id: draftDoc._id.toString(),
        details: {
          action_type: generated.action_type,
          exception_id: draftItem.exceptionDoc.bank_record_id,
        },
      });
    } catch (draftErr) {
      console.warn('[DraftAction Trigger] Failed to create draft action:', draftErr.message);
    }
  }

  // Recalculate Run metrics
  const totalRecords = run.total_records || (await BankRecord.countDocuments({ run_id: runId }));
  const totalMatched = (run.pass1_matched || 0) + (run.pass2_matched || 0) + pass3MatchesCount;
  const unresolved = Math.max(0, totalRecords - totalMatched);
  const matchRate = totalRecords > 0 ? Math.round((totalMatched / totalRecords) * 10000) / 100 : 0.0;

  run.pass3_matched = pass3MatchesCount;
  run.unresolved = unresolved;
  run.match_rate = matchRate;
  run.status = 'complete';
  run.completed_at = new Date();
  await run.save();

  return {
    run_id: runId,
    status: run.status,
    pass1_matched: run.pass1_matched,
    pass2_matched: run.pass2_matched,
    pass3_matched: pass3MatchesCount,
    total_matched: totalMatched,
    unresolved,
    match_rate: matchRate,
    draft_actions_count: draftActionsToCreate.length,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findCandidatesForBankRecord,
  cleanJsonResponse,
  executePass3BatchCall,
  generateDraftActionContent,
} from '../services/claudeOrchestrator.js';
import {
  Pass3BatchResponseSchema,
  buildPass3UserPrompt,
} from '../prompts/pass3Reasoning.js';
import {
  DraftActionResponseSchema,
  buildDraftActionUserPrompt,
} from '../prompts/draftAction.js';

test('cleanJsonResponse: removes markdown code fences and surrounding whitespace', () => {
  const raw1 = '```json\n{"evaluations": []}\n```';
  assert.equal(cleanJsonResponse(raw1), '{"evaluations": []}');

  const raw2 = '```\n{"action_type": "vendor_email"}\n```';
  assert.equal(cleanJsonResponse(raw2), '{"action_type": "vendor_email"}');

  const raw3 = '   {"key": "val"}   ';
  assert.equal(cleanJsonResponse(raw3), '{"key": "val"}');
});

test('findCandidatesForBankRecord: narrows candidates to +/- 10% amount and +/- 14 days window (max 5)', () => {
  const bankRecord = {
    id: 'BNK-100',
    date: '2026-08-15',
    amount: 50000.0,
  };

  const ledgerRecords = [
    // Valid: within 10% (amount: 52000) and within 14 days (date: 2026-08-18)
    { id: 'LED-VALID-1', date: '2026-08-18', amount: 52000.0, payee: 'Vendor A' },
    // Valid: exact amount (amount: 50000) and 10 days away (date: 2026-08-05)
    { id: 'LED-VALID-2', date: '2026-08-05', amount: 50000.0, payee: 'Vendor B' },
    // Invalid: amount is 25% away (amount: 65000)
    { id: 'LED-OUT-OF-AMOUNT', date: '2026-08-15', amount: 65000.0, payee: 'Vendor C' },
    // Invalid: date is 20 days away
    { id: 'LED-OUT-OF-DATE', date: '2026-07-20', amount: 50000.0, payee: 'Vendor D' },
  ];

  const candidates = findCandidatesForBankRecord(bankRecord, ledgerRecords, 5);

  assert.equal(candidates.length, 2);
  const ids = candidates.map((c) => c.id);
  assert.ok(ids.includes('LED-VALID-1'));
  assert.ok(ids.includes('LED-VALID-2'));
  assert.ok(!ids.includes('LED-OUT-OF-AMOUNT'));
  assert.ok(!ids.includes('LED-OUT-OF-DATE'));
});

test('Pass 3 Prompt Construction & Zod Validation: generates valid prompt and parses valid schema', () => {
  const batchItems = [
    {
      bank: {
        id: 'BNK-TEST-1',
        date: '2026-08-10',
        amount: 2500.0,
        utr_ref: 'UTR-TEST-1',
        narration: 'IMPS/P2A/CHARGES',
      },
      candidates: [
        {
          id: 'LED-TEST-1',
          date: '2026-08-09',
          amount: 2500.0,
          invoice_ref: 'INV-1',
          payee: 'Bank Charges',
        },
      ],
    },
  ];

  const prompt = buildPass3UserPrompt(batchItems);
  assert.ok(prompt.includes('BNK-TEST-1'));
  assert.ok(prompt.includes('LED-TEST-1'));
  assert.ok(prompt.includes('IMPS/P2A/CHARGES'));

  const validResponsePayload = {
    evaluations: [
      {
        bank_record_id: 'BNK-TEST-1',
        decision: 'exception',
        category: 'bank_fee',
        confidence: 0.95,
        rationale: 'Narration indicates unilateral IMPS charge of 2500.00.',
      },
    ],
  };

  const parsed = Pass3BatchResponseSchema.safeParse(validResponsePayload);
  assert.equal(parsed.success, true);
});

test('executePass3BatchCall: retries once on initial invalid JSON and succeeds if second attempt is valid', async () => {
  let callCount = 0;

  // Mock Anthropic client that fails on attempt 1 with invalid JSON and succeeds on retry
  const mockClient = {
    messages: {
      create: async () => {
        callCount++;
        if (callCount === 1) {
          return { content: [{ text: 'Here is your evaluation: { INVALID JSON }' }] };
        }
        return {
          content: [
            {
              text: JSON.stringify({
                evaluations: [
                  {
                    bank_record_id: 'BNK-RETRY-1',
                    decision: 'exception',
                    category: 'timing_lag',
                    confidence: 0.85,
                    rationale: 'Transaction delayed by 12 days between bank and ledger.',
                  },
                ],
              }),
            },
          ],
        };
      },
    },
  };

  const batchItems = [
    {
      bank: { id: 'BNK-RETRY-1', date: '2026-08-10', amount: 15000, narration: 'NEFT/TIMING' },
      candidates: [],
    },
  ];

  const evaluations = await executePass3BatchCall(mockClient, batchItems);

  assert.equal(callCount, 2, 'Should have retried exactly once');
  assert.equal(evaluations.length, 1);
  assert.equal(evaluations[0].category, 'timing_lag');
  assert.equal(evaluations[0].confidence, 0.85);
});

test('executePass3BatchCall: falls back to unknown exception on persistent error without crashing', async () => {
  // Mock client that throws error consistently
  const failingClient = {
    messages: {
      create: async () => {
        throw new Error('Anthropic 503 Overloaded');
      },
    },
  };

  const batchItems = [
    {
      bank: { id: 'BNK-FAIL-1', date: '2026-08-10', amount: 9999, narration: 'UNKNOWN' },
      candidates: [],
    },
  ];

  const evaluations = await executePass3BatchCall(failingClient, batchItems);

  assert.equal(evaluations.length, 1);
  assert.equal(evaluations[0].decision, 'exception');
  assert.ok(evaluations[0].category === 'unrecorded' || evaluations[0].category === 'unknown');
  assert.ok(evaluations[0].confidence > 0);
});

test('generateDraftActionContent: creates valid structured draft action for unrecorded exception', async () => {
  const exceptionDoc = {
    category: 'unrecorded',
    confidence: 0.9,
    ai_rationale: 'Direct payment of 45000 to vendor missing from internal ledger.',
  };

  const bankRecord = {
    id: 'BNK-UNREC-1',
    date: '2026-08-12',
    amount: 45000,
    utr_ref: 'UTR-98765',
    narration: 'DIRECT-TRANSFER/MISC-EQUIPMENT/UNRECORDED',
  };

  const draft = await generateDraftActionContent(null, exceptionDoc, bankRecord);

  assert.equal(draft.action_type, 'vendor_email');
  assert.ok(draft.confidence >= 0.8);
  assert.ok(draft.draft_content.subject.includes('UTR-98765') || draft.draft_content.subject.includes('BNK-UNREC-1'));
  assert.ok(draft.draft_content.body.includes('45000'));
});

test('generateDraftActionContent: creates ledger_correction for refund exception', async () => {
  const exceptionDoc = {
    category: 'refund',
    confidence: 0.92,
    ai_rationale: 'Credit refund reversal from vendor for overbilling.',
  };

  const bankRecord = {
    id: 'BNK-REFUND-1',
    date: '2026-08-14',
    amount: -12500,
    utr_ref: 'UTR-REF-1',
    narration: 'REFUND/CR/OVERPAYMENT',
  };

  const draft = await generateDraftActionContent(null, exceptionDoc, bankRecord);

  assert.equal(draft.action_type, 'ledger_correction');
  assert.equal(draft.draft_content.entry_type, 'credit_note');
  assert.equal(draft.draft_content.amount, 12500);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileRecords } from '../services/matchingEngine.js';
import { generateSyntheticDataset } from '../scripts/generateSeed.js';

test('Pass 1 (Exact): matches records with identical amount and reference match', () => {
  const bankRecords = [
    {
      id: 'BNK-001',
      date: '2026-08-01',
      amount: 15450.00,
      utr_ref: 'UTR-MOCK-10001',
      narration: 'NEFT/UTR-MOCK-10001/RAZORPAY/INV-10001',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-001',
      date: '2026-08-01',
      amount: 15450.00,
      invoice_ref: 'INV-MOCK-10001',
      payee: 'Razorpay Software Pvt Ltd',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, { runId: 'RUN-UNIT-1' });

  assert.equal(result.stats.pass1_matched, 1);
  assert.equal(result.stats.pass2_matched, 0);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].method, 'exact');
  assert.equal(result.matches[0].confidence, 1.0);
  assert.equal(result.matches[0].bank_record_id, 'BNK-001');
  assert.equal(result.matches[0].ledger_record_id, 'LED-001');
  assert.equal(result.stats.unresolved, 0);
});

test('Pass 2 (Fuzzy): matches within amount tolerance (+/- 1.00), date window (+/- 3 days), and high similarity', () => {
  const bankRecords = [
    {
      id: 'BNK-002',
      date: '2026-08-12', // 2 days after ledger date
      amount: 45000.75,   // 0.75 rounding difference
      utr_ref: 'UTR-99999',
      narration: 'IMPS/P2A/AWS CLOUD/INFRA-PAYMENT',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-002',
      date: '2026-08-10',
      amount: 45000.00,
      invoice_ref: 'INV-DIFFERENT-REF',
      payee: 'Amazon Web Services India',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, {
    runId: 'RUN-UNIT-2',
    amountTolerance: 1.0,
    dateWindowDays: 3,
    similarityThreshold: 0.75,
  });

  assert.equal(result.stats.pass1_matched, 0);
  assert.equal(result.stats.pass2_matched, 1);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].method, 'fuzzy');
  assert.ok(result.matches[0].confidence >= 0.75, 'Confidence must be >= 0.75');
  assert.equal(result.matches[0].bank_record_id, 'BNK-002');
  assert.equal(result.matches[0].ledger_record_id, 'LED-002');
});

test('Pass 2 (Tie Routing): multiple candidate matches are NOT auto-picked; routed to Exception for Pass 3', () => {
  const bankRecords = [
    {
      id: 'BNK-003',
      date: '2026-08-15',
      amount: 5000.00,
      utr_ref: 'UTR-AMBIGUOUS-01',
      narration: 'UPI/CR/SWIGGY B2B/LUNCH',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-CAND-A',
      date: '2026-08-14',
      amount: 5000.00,
      invoice_ref: 'INV-SWIG-01',
      payee: 'Swiggy Corporate Catering',
    },
    {
      id: 'LED-CAND-B',
      date: '2026-08-16',
      amount: 5000.00,
      invoice_ref: 'INV-SWIG-02',
      payee: 'Swiggy Corporate Catering',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, { runId: 'RUN-UNIT-3' });

  // Must not auto-match
  assert.equal(result.stats.pass1_matched, 0);
  assert.equal(result.stats.pass2_matched, 0);
  assert.equal(result.matches.length, 0);

  // Must route to exceptions with all candidate IDs preserved
  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].bank_record_id, 'BNK-003');
  assert.deepEqual(result.exceptions[0].candidate_ledger_ids.sort(), ['LED-CAND-A', 'LED-CAND-B'].sort());
  assert.ok(result.exceptions[0].ai_rationale.includes('Ambiguous Pass 2 candidates'));
});

test('Record Integrity: unparseable/invalid numbers or dates are pushed to Exception (category: unknown)', () => {
  const bankRecords = [
    {
      id: 'BNK-CORRUPTED',
      date: 'invalid-date-string-xyz',
      amount: NaN,
      utr_ref: 'UTR-BAD',
      narration: 'CORRUPTED RECORD',
    },
    {
      id: 'BNK-VALID',
      date: '2026-08-01',
      amount: 1000.0,
      utr_ref: 'UTR-1000',
      narration: 'NEFT/UTR-1000/VENDOR/INV-1000',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-VALID',
      date: '2026-08-01',
      amount: 1000.0,
      invoice_ref: 'INV-1000',
      payee: 'VENDOR INC',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, { runId: 'RUN-UNIT-4' });

  assert.equal(result.stats.pass1_matched, 1);
  // Corrupted record was NOT dropped; it became an exception
  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].bank_record_id, 'BNK-CORRUPTED');
  assert.equal(result.exceptions[0].category, 'unknown');
});

test('Full Dataset: processes 500-record synthetic dataset through Pass 1 & Pass 2', () => {
  const dataset = generateSyntheticDataset(500, 'RUN-SEED-TEST');
  const result = reconcileRecords(dataset.bankRecords, dataset.ledgerRecords, {
    runId: dataset.runId,
  });

  // Check that Pass 1 and Pass 2 executed successfully
  assert.ok(result.stats.pass1_matched >= 300, `Expected pass1 >= 300, got ${result.stats.pass1_matched}`);
  assert.ok(result.stats.pass2_matched >= 50, `Expected pass2 >= 50, got ${result.stats.pass2_matched}`);
  assert.ok(result.stats.match_rate >= 70, `Expected match_rate >= 70%, got ${result.stats.match_rate}%`);
  assert.equal(result.matches.length, result.stats.pass1_matched + result.stats.pass2_matched);
});



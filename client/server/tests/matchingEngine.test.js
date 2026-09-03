import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileRecords,
  reconcileLevel0,
  reconcileLevel1,
  reconcileLevel2,
  isUtrMatch,
} from '../services/matchingEngine.js';

test('Level 0: Bank Credit -> Settlement Batch matching via UTR and Net Amount', () => {
  const bankRecords = [
    {
      id: 'BNK-SETL-01',
      date: '2026-08-05',
      amount: 97640.00,
      utr_ref: 'UTR-RAZORPAY-882901',
      narration: 'NEFT CR: HDFC0000060 UTR-RAZORPAY-882901 RAZORPAY SETTLEMENT setl_DGlQ101os78Ec',
    },
  ];

  const settlementReports = [
    {
      settlement_id: 'setl_DGlQ101os78Ec',
      amount: 97640.00,
      utr: 'UTR-RAZORPAY-882901',
      settled_at: '2026-08-05',
    },
  ];

  const result = reconcileLevel0(bankRecords, settlementReports, { runId: 'RUN-TEST-L0' });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].level, 0);
  assert.equal(result.matches[0].bank_record_id, 'BNK-SETL-01');
  assert.equal(result.matches[0].settlement_id, 'setl_DGlQ101os78Ec');
  assert.ok(result.matches[0].confidence >= 0.9);
});

test('Level 1: Settlement Batch Explosion & Integrity Check (Balanced vs Imbalanced)', () => {
  const settlementReports = [
    {
      settlement_id: 'setl_BALANCED',
      amount: 1952.80,
      utr: 'UTR-BALANCED',
    },
    {
      settlement_id: 'setl_IMBALANCED',
      amount: 5000.00, // Stated amount is 5000
      utr: 'UTR-IMBALANCED',
    },
  ];

  const lineItems = [
    // 2 items summing to 1952.80 (Gross 1000 - 20 fee - 3.6 tax = 976.40 each * 2 = 1952.80)
    {
      settlement_id: 'setl_BALANCED',
      payment_id: 'pay_001',
      order_id: 'order_001',
      amount: 1000,
      fee: 20,
      tax: 3.6,
      net_amount: 976.40,
    },
    {
      settlement_id: 'setl_BALANCED',
      payment_id: 'pay_002',
      order_id: 'order_002',
      amount: 1000,
      fee: 20,
      tax: 3.6,
      net_amount: 976.40,
    },
    // Imbalanced batch: line items sum to 3000 but batch states 5000
    {
      settlement_id: 'setl_IMBALANCED',
      payment_id: 'pay_003',
      order_id: 'order_003',
      amount: 3000,
      fee: 60,
      tax: 10.8,
      net_amount: 2929.20,
    },
  ];

  const result = reconcileLevel1(settlementReports, lineItems, { runId: 'RUN-TEST-L1' });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].settlement_id, 'setl_BALANCED');
  assert.equal(result.matches[0].level, 1);

  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].settlement_id, 'setl_IMBALANCED');
  assert.equal(result.exceptions[0].category, 'batch_imbalance');
  assert.equal(result.exceptions[0].level, 1);
});

test('Level 2: Line-Item -> Internal Order Unpacking with 2% MDR and 18% GST variance categorization', () => {
  const lineItems = [
    {
      settlement_id: 'setl_BALANCED',
      payment_id: 'pay_001',
      order_id: 'order_MOCK_101',
      type: 'payment',
      amount: 10000.00,
      fee: 200.00, // 2.0% MDR
      tax: 36.00,  // 18% GST on MDR
      net_amount: 9764.00,
    },
    {
      settlement_id: 'setl_BALANCED',
      payment_id: 'pay_REFUND',
      order_id: 'order_MOCK_102',
      type: 'refund',
      amount: -2500.00,
      fee: 0,
      tax: 0,
      net_amount: -2500.00,
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-001',
      order_id: 'order_MOCK_101',
      amount: 10000.00,
      payee: 'Zenith Cloud Solutions',
    },
    {
      id: 'LED-002',
      order_id: 'order_MOCK_102',
      amount: -2500.00,
      payee: 'Zenith Cloud Solutions',
    },
  ];

  const balancedSet = new Set(['setl_BALANCED']);
  const result = reconcileLevel2(lineItems, ledgerRecords, balancedSet, { runId: 'RUN-TEST-L2' });

  assert.equal(result.matches.length, 2);
  const paymentMatch = result.matches.find((m) => m.payment_id === 'pay_001');
  assert.ok(paymentMatch);
  assert.equal(paymentMatch.variance_category, 'mdr_fee');
  assert.equal(paymentMatch.variance_amount, 236.00); // 200 fee + 36 tax

  const refundMatch = result.matches.find((m) => m.payment_id === 'pay_REFUND');
  assert.ok(refundMatch);
  assert.equal(refundMatch.variance_category, 'refund_deduction');
});

test('Level 2: does not match duplicate line items to the same ledger record', () => {
  const lineItems = [
    { settlement_id: 'setl_DUP', payment_id: 'pay_DUP_1', order_id: 'order_DUP', amount: 1000, net_amount: 976.4 },
    { settlement_id: 'setl_DUP', payment_id: 'pay_DUP_2', order_id: 'order_DUP', amount: 1000, net_amount: 976.4 },
  ];
  const ledgerRecords = [{ id: 'LED-DUP', order_id: 'order_DUP', amount: 1000 }];

  const result = reconcileLevel2(lineItems, ledgerRecords, new Set(['setl_DUP']), {
    runId: 'RUN-TEST-L2-DUP',
    enforceIntegrityGate: true,
  });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].ledger_record_id, 'LED-DUP');
  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].category, 'unrecorded');
});

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

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].method, 'exact');
  assert.equal(result.matches[0].confidence, 1.0);
  assert.equal(result.matches[0].bank_record_id, 'BNK-001');
  assert.equal(result.matches[0].ledger_record_id, 'LED-001');
  assert.equal(result.exceptionCount, 0);
});

test('Pass 2 (Fuzzy): matches within amount tolerance (+/- 1.00), date window (+/- 3 days), and high similarity', () => {
  const bankRecords = [
    {
      id: 'BNK-002',
      date: '2026-08-12',
      amount: 45000.75,
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

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].method, 'fuzzy');
  assert.ok(result.matches[0].confidence >= 0.70);
  assert.equal(result.matches[0].bank_record_id, 'BNK-002');
  assert.equal(result.matches[0].ledger_record_id, 'LED-002');
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
      payee: 'Valid Vendor',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, { runId: 'RUN-UNIT-4' });

  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].bank_record_id, 'BNK-CORRUPTED');
  assert.equal(result.exceptions[0].category, 'unknown');
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].bank_record_id, 'BNK-VALID');
});

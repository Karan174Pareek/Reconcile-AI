import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileRecords,
  reconcileLevel0,
  reconcileLevel1,
  reconcileLevel2,
} from '../services/matchingEngine.js';

test('Edge Case 1: Rounding differences of ₹0.01 to ₹1.00 correctly matched under fuzzy tolerance', () => {
  const bankRecords = [
    {
      id: 'BNK-ROUND-01',
      date: '2026-08-05',
      amount: 9764.05, // 5 paise floating point rounding discrepancy
      utr_ref: 'UTR-ROUND-001',
      narration: 'NEFT CR: RAZORPAY UTR-ROUND-001 SETTLEMENT',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-ROUND-01',
      date: '2026-08-04',
      amount: 9764.00,
      invoice_ref: 'INV-ROUND-001',
      payee: 'Round Vendor Inc',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, {
    runId: 'RUN-EDGE-ROUND',
    amountTolerance: 1.0,
    dateWindowDays: 3,
  });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].bank_record_id, 'BNK-ROUND-01');
  assert.equal(result.matches[0].ledger_record_id, 'LED-ROUND-01');
  assert.equal(result.matches[0].method, 'fuzzy');
});

test('Edge Case 2: Multiple bank credits correlated to a single settlement batch', () => {
  const bankRecords = [
    {
      id: 'BNK-SPLIT-01',
      date: '2026-08-05',
      amount: 50000.00,
      utr_ref: 'UTR-SPLIT-101',
      narration: 'NEFT CR: RAZORPAY PARTIAL 1 UTR-SPLIT-101 setl_SPLIT_01',
    },
    {
      id: 'BNK-SPLIT-02',
      date: '2026-08-06',
      amount: 47640.00,
      utr_ref: 'UTR-SPLIT-102',
      narration: 'NEFT CR: RAZORPAY PARTIAL 2 UTR-SPLIT-102 setl_SPLIT_01',
    },
  ];

  const settlementReports = [
    {
      settlement_id: 'setl_SPLIT_01',
      amount: 97640.00,
      utr: 'UTR-SPLIT-101',
      settled_at: '2026-08-05',
    },
  ];

  const result = reconcileLevel0(bankRecords, settlementReports, { runId: 'RUN-EDGE-SPLIT' });

  assert.ok(result.matches.length >= 1);
  assert.equal(result.matches[0].settlement_id, 'setl_SPLIT_01');
});

test('Edge Case 3: Empty settlement batch with zero constituent order line items', () => {
  const settlementReports = [
    {
      settlement_id: 'setl_EMPTY_01',
      amount: 0.00,
      utr: 'UTR-EMPTY-00',
    },
  ];

  const lineItems = [];

  const result = reconcileLevel1(settlementReports, lineItems, { runId: 'RUN-EDGE-EMPTY' });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].settlement_id, 'setl_EMPTY_01');
  assert.equal(result.matches[0].total_line_items, 0);
  assert.equal(result.exceptions.length, 0);
});

test('Edge Case 4: Duplicate / replayed webhook-style record deduplication', () => {
  const bankRecords = [
    {
      id: 'BNK-DUP-01',
      date: '2026-08-01',
      amount: 15450.00,
      utr_ref: 'UTR-REPLAY-99',
      narration: 'NEFT/UTR-REPLAY-99/RECON',
    },
    {
      id: 'BNK-DUP-01-REPLAY',
      date: '2026-08-01',
      amount: 15450.00,
      utr_ref: 'UTR-REPLAY-99',
      narration: 'NEFT/UTR-REPLAY-99/RECON DUPLICATE',
    },
  ];

  const ledgerRecords = [
    {
      id: 'LED-DUP-01',
      date: '2026-08-01',
      amount: 15450.00,
      invoice_ref: 'INV-DUP-01',
      payee: 'Unique Vendor',
    },
  ];

  const result = reconcileRecords(bankRecords, ledgerRecords, { runId: 'RUN-EDGE-DUP' });

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].ledger_record_id, 'LED-DUP-01');
});

test('Edge Case 5: All batches imbalanced — Level 1 quarantines and Level 2 gate prevents unpacking', () => {
  const settlementReports = [
    {
      settlement_id: 'setl_IMBAL_01',
      amount: 1000.00,
      utr: 'UTR-IMBAL-01',
      settled_at: '2026-08-05',
    },
  ];

  // Sum of line items = 500, but batch claims 1000 => imbalance
  const lineItems = [
    {
      id: 'item_imbal_1',
      settlement_id: 'setl_IMBAL_01',
      payment_id: 'pay_imbal_1',
      order_id: 'order_imbal_1',
      amount: 500,
      fee: 10,
      tax: 1.8,
      net_amount: 488.2,
      type: 'payment',
    },
  ];

  const ledgerRecords = [
    {
      id: 'led_imbal_1',
      order_id: 'order_imbal_1',
      amount: 500,
      date: '2026-08-05',
    },
  ];

  const l1 = reconcileLevel1(settlementReports, lineItems, { runId: 'RUN-EDGE-IMBAL' });
  assert.equal(l1.balancedSettlementIds.size, 0);
  assert.equal(l1.exceptions.length, 1);
  assert.equal(l1.exceptions[0].category, 'batch_imbalance');

  const l2 = reconcileLevel2(lineItems, ledgerRecords, l1.balancedSettlementIds, {
    runId: 'RUN-EDGE-IMBAL',
    enforceIntegrityGate: true,
  });

  assert.equal(l2.matches.length, 0);
});

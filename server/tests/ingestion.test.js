import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BankRecordRowSchema,
  LedgerRecordRowSchema,
  validateCsvRows,
} from '../validators/ingestionSchemas.js';

test('validateCsvRows: accepts valid bank and ledger rows and parses dates/amounts', () => {
  const bankRows = [
    {
      id: 'BNK-1',
      date: '2026-08-10',
      amount: '12,500.50',
      utr_ref: 'UTR-12345',
      narration: 'NEFT/UTR-12345/RAZORPAY',
    },
  ];

  const ledgerRows = [
    {
      id: 'LED-1',
      date: '2026-08-10',
      amount: '12500.50',
      invoice_ref: 'INV-12345',
      payee: 'Razorpay Software Pvt Ltd',
    },
  ];

  const bankResult = validateCsvRows(bankRows, BankRecordRowSchema, 'bank');
  assert.equal(bankResult.errors.length, 0);
  assert.equal(bankResult.validRecords.length, 1);
  assert.equal(bankResult.validRecords[0].amount, 12500.50);
  assert.ok(bankResult.validRecords[0].date instanceof Date);

  const ledgerResult = validateCsvRows(ledgerRows, LedgerRecordRowSchema, 'ledger');
  assert.equal(ledgerResult.errors.length, 0);
  assert.equal(ledgerResult.validRecords.length, 1);
});

test('validateCsvRows: flags row-level errors with row number, field, and clear message', () => {
  const invalidBankRows = [
    {
      // Row 1 (Valid)
      id: 'BNK-1',
      date: '2026-08-10',
      amount: '500.00',
      utr_ref: 'UTR-100',
      narration: 'VALID ROW',
    },
    {
      // Row 2 (Invalid amount and invalid date)
      id: 'BNK-2',
      date: 'not-a-date',
      amount: 'invalid-amount',
      utr_ref: '', // empty utr_ref
      narration: 'MISSING FIELDS',
    },
  ];

  const result = validateCsvRows(invalidBankRows, BankRecordRowSchema, 'bank');
  assert.equal(result.validRecords.length, 1);
  assert.ok(result.errors.length >= 2, `Expected at least 2 errors, got ${result.errors.length}`);

  const row2Errors = result.errors.filter((e) => e.row === 2);
  assert.ok(row2Errors.some((e) => e.field === 'date'));
  assert.ok(row2Errors.some((e) => e.field === 'amount'));
  assert.ok(row2Errors.some((e) => e.field === 'utr_ref'));
});

test('validateCsvRows: rejects empty CSV dataset', () => {
  const result = validateCsvRows([], BankRecordRowSchema, 'bank');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].field, 'file');
  assert.ok(result.errors[0].message.includes('empty'));
});

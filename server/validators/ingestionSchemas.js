import { z } from 'zod';

/**
 * Coerces date string or Date object to a valid ISO Date object
 */
const DateSchema = z.preprocess((val) => {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return 'INVALID_DATE';
}, z.date({ invalid_type_error: 'Invalid or unparseable date format' }));

/**
 * Coerces string or number to a valid finite float
 */
const AmountSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isFinite(val) ? val : undefined;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = Number(cleaned);
    return isFinite(num) ? num : undefined;
  }
  return undefined;
}, z.number({ invalid_type_error: 'Amount must be a valid numeric value', required_error: 'Amount is required' }));

/**
 * Bank CSV Row Schema
 */
export const BankRecordRowSchema = z.object({
  id: z.string().trim().optional(),
  date: DateSchema,
  amount: AmountSchema,
  utr_ref: z.string({ required_error: 'utr_ref is required' }).trim().min(1, 'utr_ref cannot be empty'),
  narration: z.string({ required_error: 'narration is required' }).trim().min(1, 'narration cannot be empty'),
});

/**
 * Ledger CSV Row Schema
 */
export const LedgerRecordRowSchema = z.object({
  id: z.string().trim().optional(),
  date: DateSchema,
  amount: AmountSchema,
  invoice_ref: z.string({ required_error: 'invoice_ref is required' }).trim().min(1, 'invoice_ref cannot be empty'),
  payee: z.string({ required_error: 'payee is required' }).trim().min(1, 'payee cannot be empty'),
});

/**
 * Validates a parsed array of rows against a given Zod schema.
 * Collects row-level error details with index, field, received value, and error message.
 *
 * @param {Array<object>} rows - Parsed rows from CSV
 * @param {z.ZodSchema} schema - Zod schema for individual row
 * @param {string} datasetType - 'bank' or 'ledger'
 * @returns {{ validRecords: Array<object>, errors: Array<object> }}
 */
export function validateCsvRows(rows, schema, datasetType = 'bank') {
  const validRecords = [];
  const errors = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: `${datasetType} CSV is empty or has no valid data rows`,
      received: null,
    });
    return { validRecords, errors };
  }

  rows.forEach((row, idx) => {
    // 1-indexed for human readability (row 1 is first data row after header)
    const rowNumber = idx + 1;
    const result = schema.safeParse(row);

    if (result.success) {
      validRecords.push(result.data);
    } else {
      result.error.issues.forEach((issue) => {
        const field = issue.path.join('.') || 'row';
        errors.push({
          row: rowNumber,
          field,
          message: issue.message,
          received: row[field] !== undefined ? row[field] : null,
        });
      });
    }
  });

  return { validRecords, errors };
}

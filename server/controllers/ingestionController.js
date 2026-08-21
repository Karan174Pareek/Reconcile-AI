import multer from 'multer';
import Papa from 'papaparse';
import crypto from 'crypto';
import {
  BankRecordRowSchema,
  LedgerRecordRowSchema,
  validateCsvRows,
} from '../validators/ingestionSchemas.js';
import Run from '../models/Run.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import { generateSyntheticDataset } from '../scripts/generateSeed.js';

// Configure Multer for in-memory CSV file handling (up to 25MB per file)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}. Only CSV files are supported.`));
    }
  },
}).fields([
  { name: 'bank_csv', maxCount: 1 },
  { name: 'ledger_csv', maxCount: 1 },
]);

/**
 * Parses raw CSV buffer using PapaParse in strict mode
 */
function parseCsvBuffer(buffer) {
  const content = buffer.toString('utf8');
  const parseResult = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'),
  });

  return parseResult.data;
}

/**
 * Controller: Handles bank & ledger CSV upload with strict Zod validation
 * POST /api/runs/upload
 */
export async function uploadCsvFiles(req, res, next) {
  try {
    const files = req.files;

    if (!files || !files.bank_csv || !files.ledger_csv) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILES',
          message: 'Both "bank_csv" and "ledger_csv" files are required.',
          details: null,
        },
      });
    }

    // 1. Parse CSV buffers
    const bankRows = parseCsvBuffer(files.bank_csv[0].buffer);
    const ledgerRows = parseCsvBuffer(files.ledger_csv[0].buffer);

    // 2. Strict Zod schema validation
    const { validRecords: validBankRows, errors: bankErrors } = validateCsvRows(
      bankRows,
      BankRecordRowSchema,
      'bank'
    );
    const { validRecords: validLedgerRows, errors: ledgerErrors } = validateCsvRows(
      ledgerRows,
      LedgerRecordRowSchema,
      'ledger'
    );

    // If there are any validation errors, reject upfront with detailed row errors
    if (bankErrors.length > 0 || ledgerErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'CSV_VALIDATION_ERROR',
          message: `CSV validation failed with ${bankErrors.length} bank error(s) and ${ledgerErrors.length} ledger error(s).`,
          details: {
            bank_errors: bankErrors,
            ledger_errors: ledgerErrors,
          },
        },
      });
    }

    // 3. Create unique Run ID
    const runId = req.body.run_id || `RUN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // Format Bank Records
    const bankDocs = validBankRows.map((row) => ({
      id: row.id || `BNK-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      date: row.date,
      amount: row.amount,
      utr_ref: row.utr_ref,
      narration: row.narration,
      status: 'pending',
    }));

    // Format Ledger Records
    const ledgerDocs = validLedgerRows.map((row) => ({
      id: row.id || `LED-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      date: row.date,
      amount: row.amount,
      invoice_ref: row.invoice_ref,
      payee: row.payee,
      status: 'pending',
    }));

    // 4. Persist to MongoDB
    await Run.create({
      run_id: runId,
      status: 'pending',
      total_records: bankDocs.length,
      pass1_matched: 0,
      pass2_matched: 0,
      pass3_matched: 0,
      unresolved: bankDocs.length,
      match_rate: 0.0,
      created_at: new Date(),
    });

    await BankRecord.insertMany(bankDocs);
    await LedgerRecord.insertMany(ledgerDocs);

    return res.status(201).json({
      success: true,
      message: 'CSVs uploaded and validated successfully',
      run_id: runId,
      total_bank_records: bankDocs.length,
      total_ledger_records: ledgerDocs.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Programmatically generates synthetic seed data for a given or new run_id
 * POST /api/runs/generate-seed
 */
export async function generateSeedRun(req, res, next) {
  try {
    const count = parseInt(req.body.count, 10) || 500;
    const runId = req.body.run_id || `RUN-SEED-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const dataset = generateSyntheticDataset(count, runId);
    const { bankRecords, ledgerRecords, stats } = dataset;

    // Clean internal metadata tags before DB insertion
    const cleanBank = bankRecords.map(({ _meta_category, ...rec }) => rec);
    const cleanLedger = ledgerRecords.map(({ _meta_category, ...rec }) => rec);

    await Run.findOneAndUpdate(
      { run_id: runId },
      {
        run_id: runId,
        status: 'pending',
        total_records: cleanBank.length,
        pass1_matched: 0,
        pass2_matched: 0,
        pass3_matched: 0,
        unresolved: cleanBank.length,
        match_rate: 0.0,
        created_at: new Date(),
        completed_at: null,
      },
      { upsert: true, new: true }
    );

    await BankRecord.insertMany(cleanBank);
    await LedgerRecord.insertMany(cleanLedger);

    return res.status(201).json({
      success: true,
      message: `Synthetic seed dataset generated for run ${runId}`,
      run_id: runId,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

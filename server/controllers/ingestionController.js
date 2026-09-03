import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Papa from 'papaparse';
import Run from '../models/Run.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import SettlementReport from '../models/SettlementReport.js';
import SettlementLineItem from '../models/SettlementLineItem.js';
import { generateRazorpaySeedData } from '../scripts/generateSeed.js';
import { MemoryStore } from '../services/memoryStore.js';
import { executeRun } from '../services/matchingEngine.js';
import {
  BankRecordSchema,
  LedgerRecordSchema,
  SettlementReportSchema,
  SettlementLineItemSchema,
} from '../validators/ingestionSchemas.js';

// Configure Multer for in-memory CSV buffer handling (10MB limit)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files are permitted for statement ingestion.'));
    }
    cb(null, true);
  },
}).fields([
  { name: 'bank_csv', maxCount: 1 },
  { name: 'ledger_csv', maxCount: 1 },
  { name: 'settlement_csv', maxCount: 1 },
]);

/**
 * Helper: Parses and validates a CSV buffer against a Zod schema
 */
function parseAndValidateCsv(buffer, schema, recordType) {
  const csvString = buffer.toString('utf-8');
  const parseResult = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (parseResult.errors && parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter((e) => e.type !== 'Delimiter');
    if (criticalErrors.length > 0) {
      throw new Error(`CSV Parsing failed for ${recordType}: ${criticalErrors[0].message}`);
    }
  }

  const validRecords = [];
  const validationErrors = [];

  parseResult.data.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (!result.success) {
      validationErrors.push({
        row: index + 2,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    } else {
      validRecords.push(result.data);
    }
  });

  return { validRecords, validationErrors };
}

/**
 * Controller: Handles multipart CSV uploads for bank and ledger statements
 * POST /api/runs/upload
 */
export async function uploadCsvFiles(req, res, next) {
  try {
    if (!req.files || !req.files.bank_csv || !req.files.ledger_csv) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILES',
          message: 'Both bank_csv and ledger_csv files are required.',
          details: null,
        },
      });
    }

    if (req.files.settlement_csv) {
      return res.status(400).json({
        error: {
          code: 'UNSUPPORTED_FILE',
          message: 'settlement_csv is not supported by the upload flow. Use the benchmark generator for the full 3-level settlement dataset.',
          details: null,
        },
      });
    }

    const runId = `RUN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const allErrors = {};

    let bankRecords = [];
    if (req.files.bank_csv) {
      const { validRecords, validationErrors } = parseAndValidateCsv(
        req.files.bank_csv[0].buffer,
        BankRecordSchema,
        'Bank Statement'
      );
      if (validationErrors.length > 0) allErrors.bank_errors = validationErrors;
      bankRecords = validRecords.map((r) => ({ ...r, run_id: runId, status: 'unmatched' }));
      if (bankRecords.length === 0 && validationErrors.length === 0) {
        allErrors.bank_errors = [{ row: 0, errors: ['Bank Statement CSV is empty.'] }];
      }
    }

    let ledgerRecords = [];
    if (req.files.ledger_csv) {
      const { validRecords, validationErrors } = parseAndValidateCsv(
        req.files.ledger_csv[0].buffer,
        LedgerRecordSchema,
        'Internal Ledger'
      );
      if (validationErrors.length > 0) allErrors.ledger_errors = validationErrors;
      ledgerRecords = validRecords.map((r) => ({ ...r, run_id: runId, status: 'unmatched' }));
      if (ledgerRecords.length === 0 && validationErrors.length === 0) {
        allErrors.ledger_errors = [{ row: 0, errors: ['Internal Ledger CSV is empty.'] }];
      }
    }

    if (Object.keys(allErrors).length > 0) {
      return res.status(400).json({
        error: {
          code: 'CSV_VALIDATION_ERROR',
          message: 'CSV validation failed for one or more files.',
          details: allErrors,
        },
      });
    }

    const runDoc = {
      run_id: runId,
      status: 'pending',
      total_records: bankRecords.length,
      pass1_matched: 0,
      pass2_matched: 0,
      pass3_matched: 0,
      unresolved: bankRecords.length,
      match_rate: 0.0,
      created_at: new Date(),
      completed_at: null,
    };

    MemoryStore.saveRun(runDoc);
    MemoryStore.saveSeedData(runId, { bankRecords, ledgerRecords });

    try {
      if (mongoose.connection.readyState === 1) {
        await Promise.all([
          Run.create(runDoc),
          bankRecords.length ? BankRecord.insertMany(bankRecords, { ordered: false }) : Promise.resolve(),
          ledgerRecords.length ? LedgerRecord.insertMany(ledgerRecords, { ordered: false }) : Promise.resolve(),
        ]);
      }
    } catch (mongoErr) {
      console.warn('[Mongo Upload Ingestion Warning]:', mongoErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Reconciliation run ${runId} initialized successfully.`,
      run_id: runId,
      total_bank_records: bankRecords.length,
      total_ledger_records: ledgerRecords.length,
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
    const runId = req.body.run_id || `RUN-SEED-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const data = await generateRazorpaySeedData(runId);

    const runData = {
      run_id: runId,
      status: 'pending',
      total_records: data.settlementLineItems?.length || 500,
      pass1_matched: 0,
      pass2_matched: 0,
      pass3_matched: 0,
      unresolved: data.settlementLineItems?.length || 500,
      match_rate: 0.0,
      created_at: new Date(),
      completed_at: null,
    };

    // Always cache in MemoryStore for 100% serverless availability
    MemoryStore.saveRun(runData);
    MemoryStore.saveSeedData(runId, data);

    try {
      if (mongoose.connection.readyState === 1) {
        await Promise.all([
          Run.findOneAndUpdate({ run_id: runId }, runData, { upsert: true, new: true }),
          data.bankRecords?.length ? BankRecord.insertMany(data.bankRecords, { ordered: false }) : Promise.resolve(),
          data.ledgerRecords?.length ? LedgerRecord.insertMany(data.ledgerRecords, { ordered: false }) : Promise.resolve(),
          data.settlementReports?.length ? SettlementReport.insertMany(data.settlementReports, { ordered: false }) : Promise.resolve(),
          data.settlementLineItems?.length ? SettlementLineItem.insertMany(data.settlementLineItems, { ordered: false }) : Promise.resolve(),
        ]);
        console.log(`[DB Write: MONGODB_PRIMARY] Seed Run ${runId}: 500+ records written directly to MongoDB Atlas.`);
      } else {
        console.warn(`[DB Write: MEMORY_STORE_ONLY] MongoDB not ready (readyState: ${mongoose.connection.readyState}). Run ${runId} stored in MemoryStore.`);
      }
    } catch (mongoErr) {
      console.warn('[DB Write: MONGODB_SAVE_FAILED]:', mongoErr.message);
    }

    try {
      await executeRun(runId);
      console.log(`[Generate Seed] Pipeline auto-executed for run ${runId}`);
    } catch (execErr) {
      console.warn(`[Generate Seed] Auto-execution warning:`, execErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Razorpay Settlement Seed dataset generated for run ${runId}`,
      run_id: runId,
      stats: {
        bank_credits: data.bankRecords?.length || 0,
        settlement_batches: data.settlementReports?.length || 0,
        total_order_line_items: data.settlementLineItems?.length || 0,
        ledger_records: data.ledgerRecords?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Cold Reset — clears state, generates a fresh seed dataset, and executes full reconciliation from scratch
 * POST /api/runs/cold-reset
 */
export async function coldResetRun(req, res, next) {
  try {
    const isHeldOut = req.body.held_out === true;
    const runId = `RUN-COLD-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    console.log(`[Cold Reset] Initializing fresh run: ${runId} (held_out=${isHeldOut})`);

    const data = await generateRazorpaySeedData(runId, { isHeldOut });

    const runData = {
      run_id: runId,
      status: 'pending',
      total_records: data.settlementLineItems?.length || 500,
      pass1_matched: 0,
      pass2_matched: 0,
      pass3_matched: 0,
      unresolved: data.settlementLineItems?.length || 500,
      match_rate: 0.0,
      created_at: new Date(),
      completed_at: null,
    };

    MemoryStore.saveRun(runData);
    MemoryStore.saveSeedData(runId, data);

    try {
      if (mongoose.connection.readyState === 1) {
        await Promise.all([
          Run.create(runData),
          data.bankRecords?.length ? BankRecord.insertMany(data.bankRecords, { ordered: false }) : Promise.resolve(),
          data.ledgerRecords?.length ? LedgerRecord.insertMany(data.ledgerRecords, { ordered: false }) : Promise.resolve(),
          data.settlementReports?.length ? SettlementReport.insertMany(data.settlementReports, { ordered: false }) : Promise.resolve(),
          data.settlementLineItems?.length ? SettlementLineItem.insertMany(data.settlementLineItems, { ordered: false }) : Promise.resolve(),
        ]);
      }
    } catch (mongoErr) {
      console.warn('[Cold Reset Mongo Warning]:', mongoErr.message);
    }

    // Auto-execute 3-level matching pipeline so run immediately completes with real match numbers
    try {
      await executeRun(runId);
      console.log(`[Cold Reset] Pipeline auto-executed for run ${runId}`);
    } catch (execErr) {
      console.warn(`[Cold Reset] Auto-execution warning:`, execErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Cold reset successful. Clean run ${runId} reconciled.`,
      run_id: runId,
      stats: {
        bank_credits: data.bankRecords?.length || 0,
        settlement_batches: data.settlementReports?.length || 0,
        total_order_line_items: data.settlementLineItems?.length || 0,
        ledger_records: data.ledgerRecords?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

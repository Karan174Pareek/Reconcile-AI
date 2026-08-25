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
import SettlementReport from '../models/SettlementReport.js';
import SettlementLineItem from '../models/SettlementLineItem.js';
import { generateRazorpaySeedData } from '../scripts/generateSeed.js';

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
  { name: 'settlements_csv', maxCount: 1 },
  { name: 'line_items_csv', maxCount: 1 },
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

    const bankRows = parseCsvBuffer(files.bank_csv[0].buffer);
    const ledgerRows = parseCsvBuffer(files.ledger_csv[0].buffer);

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

    const runId = req.body.run_id || `RUN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const bankDocs = validBankRows.map((row) => ({
      id: row.id || `BNK-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      date: row.date,
      amount: row.amount,
      utr_ref: row.utr_ref,
      narration: row.narration,
      status: 'pending',
    }));

    const ledgerDocs = validLedgerRows.map((row) => ({
      id: row.id || `LED-${crypto.randomUUID().substring(0, 8)}`,
      run_id: runId,
      date: row.date,
      amount: row.amount,
      invoice_ref: row.invoice_ref,
      payee: row.payee,
      status: 'pending',
    }));

    // If optional settlement files were also uploaded
    let settlementDocs = [];
    let lineItemDocs = [];
    if (files.settlements_csv) {
      const setlRows = parseCsvBuffer(files.settlements_csv[0].buffer);
      settlementDocs = setlRows.map((r) => ({
        run_id: runId,
        settlement_id: r.settlement_id,
        amount: Number(r.amount) || 0,
        gross_amount: Number(r.gross_amount) || 0,
        fees: Number(r.fees) || 0,
        tax: Number(r.tax) || 0,
        refunds: Number(r.refunds) || 0,
        utr: r.utr,
        status: r.status || 'settled',
        settled_at: new Date(r.settled_at || r.date || new Date()),
        item_count: Number(r.item_count) || 0,
      }));
    }

    if (files.line_items_csv) {
      const lineRows = parseCsvBuffer(files.line_items_csv[0].buffer);
      lineItemDocs = lineRows.map((r) => ({
        run_id: runId,
        settlement_id: r.settlement_id,
        payment_id: r.payment_id,
        order_id: r.order_id,
        type: r.type || 'payment',
        amount: Number(r.amount) || 0,
        fee: Number(r.fee) || 0,
        tax: Number(r.tax) || 0,
        debit: Number(r.debit) || 0,
        credit: Number(r.credit) || 0,
        net_amount: Number(r.net_amount) || 0,
        settled_at: new Date(r.settled_at || r.date || new Date()),
      }));
    }

    const totalRecords = lineItemDocs.length > 0 ? lineItemDocs.length : bankDocs.length;

    await Run.create({
      run_id: runId,
      status: 'pending',
      total_records: totalRecords,
      pass1_matched: 0,
      pass2_matched: 0,
      pass3_matched: 0,
      unresolved: totalRecords,
      match_rate: 0.0,
      created_at: new Date(),
    });

    if (bankDocs.length > 0) await BankRecord.insertMany(bankDocs, { ordered: false });
    if (ledgerDocs.length > 0) await LedgerRecord.insertMany(ledgerDocs, { ordered: false });
    if (settlementDocs.length > 0) await SettlementReport.insertMany(settlementDocs, { ordered: false });
    if (lineItemDocs.length > 0) await SettlementLineItem.insertMany(lineItemDocs, { ordered: false });

    return res.status(201).json({
      success: true,
      message: 'CSVs uploaded and validated successfully',
      run_id: runId,
      total_bank_records: bankDocs.length,
      total_ledger_records: ledgerDocs.length,
      total_settlement_batches: settlementDocs.length,
      total_line_items: lineItemDocs.length,
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

    await Run.findOneAndUpdate(
      { run_id: runId },
      {
        run_id: runId,
        status: 'pending',
        total_records: data.settlementLineItems.length,
        pass1_matched: 0,
        pass2_matched: 0,
        pass3_matched: 0,
        unresolved: data.settlementLineItems.length,
        match_rate: 0.0,
        created_at: new Date(),
        completed_at: null,
      },
      { upsert: true, new: true }
    );

    if (data.bankRecords?.length) await BankRecord.insertMany(data.bankRecords, { ordered: false });
    if (data.ledgerRecords?.length) await LedgerRecord.insertMany(data.ledgerRecords, { ordered: false });
    if (data.settlementReports?.length) await SettlementReport.insertMany(data.settlementReports, { ordered: false });
    if (data.settlementLineItems?.length) await SettlementLineItem.insertMany(data.settlementLineItems, { ordered: false });

    return res.status(201).json({
      success: true,
      message: `Razorpay Settlement Seed dataset generated for run ${runId}`,
      run_id: runId,
      stats: {
        bank_credits: data.bankRecords.length,
        settlement_batches: data.settlementReports.length,
        total_order_line_items: data.settlementLineItems.length,
        ledger_records: data.ledgerRecords.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

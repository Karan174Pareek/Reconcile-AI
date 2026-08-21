import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { connectDB, disconnectDB } from '../config/db.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import Run from '../models/Run.js';
import User from '../models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Realist B2B Vendors & Payees for Mock Data
const VENDORS = [
  { name: 'Razorpay Software Pvt Ltd', prefix: 'RAZORPAY', category: 'Payment Gateway' },
  { name: 'Amazon Web Services India', prefix: 'AWS CLOUD', category: 'Cloud Infrastructure' },
  { name: 'Google Cloud India Pvt Ltd', prefix: 'GOOGLE WORKSPACE', category: 'SaaS' },
  { name: 'Microsoft Regional Sales', prefix: 'MSFT AZURE', category: 'Cloud Infrastructure' },
  { name: 'Slack Technologies LLC', prefix: 'SLACK TECH', category: 'Collaboration' },
  { name: 'Zoho Corporation Pvt Ltd', prefix: 'ZOHO CORP', category: 'CRM & Accounting' },
  { name: 'Freshworks Technologies', prefix: 'FRESHWORKS', category: 'Support Tool' },
  { name: 'Airtel Enterprise Telecom', prefix: 'BHARTI AIRTEL', category: 'Telecommunications' },
  { name: 'Tata Communications Ltd', prefix: 'TATA COMM', category: 'Networking' },
  { name: 'WeWork India Management', prefix: 'WEWORK COWORKING', category: 'Real Estate' },
  { name: 'Swiggy Corporate Catering', prefix: 'SWIGGY B2B', category: 'Corporate Catering' },
  { name: 'Uber for Business Solutions', prefix: 'UBER BIZ', category: 'Corporate Travel' },
  { name: 'Delhivery Logistics Ltd', prefix: 'DELHIVERY LOGISTICS', category: 'Freight & Courier' },
  { name: 'Notion Labs Inc', prefix: 'NOTION HQ', category: 'Productivity' },
  { name: 'GitHub Enterprise Services', prefix: 'GITHUB INC', category: 'Dev Tools' },
  { name: 'Atlassian Pty Ltd', prefix: 'ATLASSIAN JIRA', category: 'Dev Tools' },
  { name: 'HubSpot Ireland Ltd', prefix: 'HUBSPOT MARKETING', category: 'Marketing' },
  { name: 'Stripe India Payments', prefix: 'STRIPE PAY', category: 'Payment Gateway' },
  { name: 'KPMG India Advisory', prefix: 'KPMG AUDIT', category: 'Professional Services' },
  { name: 'PwC India Tax Consulting', prefix: 'PWC CONSULTING', category: 'Tax Advisory' }
];

const BANK_FEE_DESCRIPTIONS = [
  'CMS MONTHLY MAINTENANCE CHARGES',
  'IMPS OUTWARD TXN CONVENIENCE FEE + GST',
  'BULK RTGS PROCESSING CHARGE',
  'CURRENT ACCOUNT QUARTERLY LEDGER FOLIO CHG',
  'CORPORATE NETBANKING TOKEN RENEWAL CHARGE',
  'BANK GUARANTEE SERVICING FEE'
];

/**
 * Random helper utilities
 */
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const roundTwoDecimals = (num) => Math.round(num * 100) / 100;

const getRandomDateInPast = (daysBack = 45) => {
  const target = new Date();
  const offset = randomBetween(1, daysBack);
  target.setDate(target.getDate() - offset);
  target.setHours(randomBetween(9, 18), randomBetween(0, 59), randomBetween(0, 59), 0);
  return target;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Generate synthetic dataset with realistic distribution
 */
export function generateSyntheticDataset(totalRecords = 500, runId = `RUN-SEED-${Date.now()}`) {
  const bankRecords = [];
  const ledgerRecords = [];

  // Target distributions:
  // ~65% exact matches
  // ~18% timing lag & minor narration fuzziness
  // ~5% duplicates (duplicate bank records for single ledger entry)
  // ~5% bank fees (bank charges with no ledger counterpart)
  // ~3% refunds (negative amounts)
  // ~2% unrecorded / genuine exceptions (at least 1 guaranteed)

  const exactCount = Math.floor(totalRecords * 0.65);
  const timingLagCount = Math.floor(totalRecords * 0.18);
  const duplicateCount = Math.max(2, Math.floor(totalRecords * 0.05));
  const bankFeeCount = Math.max(2, Math.floor(totalRecords * 0.05));
  const refundCount = Math.max(2, Math.floor(totalRecords * 0.03));
  const unrecordedCount = Math.max(1, totalRecords - (exactCount + timingLagCount + duplicateCount + bankFeeCount + refundCount));

  let refCounter = 10000;

  // 1. Perfect Exact Matches (~65%)
  for (let i = 0; i < exactCount; i++) {
    refCounter++;
    const vendor = randomChoice(VENDORS);
    const amount = roundTwoDecimals(randomBetween(5000, 450000) + Math.random());
    const date = getRandomDateInPast(30);
    const utrRef = `UTR-MOCK-${refCounter}`;
    const invoiceRef = `INV-MOCK-${refCounter}`;
    const recId = crypto.randomUUID();

    bankRecords.push({
      id: `BNK-${recId.substring(0, 8)}`,
      run_id: runId,
      date,
      amount,
      utr_ref: utrRef,
      narration: `NEFT/${utrRef}/${vendor.prefix}/INV-${refCounter}`,
      status: 'pending',
      _meta_category: 'exact'
    });

    ledgerRecords.push({
      id: `LED-${recId.substring(0, 8)}`,
      run_id: runId,
      date,
      amount,
      invoice_ref: invoiceRef,
      payee: vendor.name,
      status: 'pending',
      _meta_category: 'exact'
    });
  }

  // 2. Timing Lag (+/- 1-3 days) & Minor Narration Discrepancies (~18%)
  for (let i = 0; i < timingLagCount; i++) {
    refCounter++;
    const vendor = randomChoice(VENDORS);
    const amount = roundTwoDecimals(randomBetween(8000, 250000) + Math.random());
    const ledgerDate = getRandomDateInPast(35);
    const dayDelta = randomChoice([-3, -2, -1, 1, 2, 3]);
    const bankDate = addDays(ledgerDate, dayDelta);

    const utrRef = `UTR-MOCK-${refCounter}`;
    const invoiceRef = `INV-MOCK-${refCounter}`;
    const recId = crypto.randomUUID();

    // Minor narration variations (e.g. abbreviation, truncated prefix, UPI format)
    const narrationStyles = [
      `IMPS/P2A/${utrRef}/${vendor.prefix.substring(0, 6)}/SETTLEMENT`,
      `UPI/CR/${utrRef}/${vendor.name.substring(0, 10).toUpperCase()}/PAYMENT`,
      `ACH-DR/${utrRef}/${vendor.prefix}/BILL-${refCounter}`,
      `RTGS-OUT/${utrRef}/${vendor.prefix} SERVICES`
    ];

    bankRecords.push({
      id: `BNK-${recId.substring(0, 8)}`,
      run_id: runId,
      date: bankDate,
      amount,
      utr_ref: utrRef,
      narration: randomChoice(narrationStyles),
      status: 'pending',
      _meta_category: 'timing_lag'
    });

    ledgerRecords.push({
      id: `LED-${recId.substring(0, 8)}`,
      run_id: runId,
      date: ledgerDate,
      amount,
      invoice_ref: invoiceRef,
      payee: vendor.name,
      status: 'pending',
      _meta_category: 'timing_lag'
    });
  }

  // 3. Duplicate Bank Records (~5% - 2 bank debits for 1 ledger entry)
  for (let i = 0; i < duplicateCount; i++) {
    refCounter++;
    const vendor = randomChoice(VENDORS);
    const amount = roundTwoDecimals(randomBetween(12000, 85000) + Math.random());
    const date = getRandomDateInPast(20);
    const utrRef1 = `UTR-MOCK-${refCounter}`;
    const utrRef2 = `UTR-MOCK-${refCounter}-DUP`;
    const invoiceRef = `INV-MOCK-${refCounter}`;
    const recId1 = crypto.randomUUID();
    const recId2 = crypto.randomUUID();

    // 1st bank entry (normal)
    bankRecords.push({
      id: `BNK-${recId1.substring(0, 8)}`,
      run_id: runId,
      date,
      amount,
      utr_ref: utrRef1,
      narration: `NEFT/${utrRef1}/${vendor.prefix}/INV-${refCounter}`,
      status: 'pending',
      _meta_category: 'duplicate_orig'
    });

    // 2nd duplicate bank entry (same day or next day duplicate debit)
    bankRecords.push({
      id: `BNK-${recId2.substring(0, 8)}`,
      run_id: runId,
      date: addDays(date, randomChoice([0, 1])),
      amount,
      utr_ref: utrRef2,
      narration: `NEFT/${utrRef1}/${vendor.prefix}/INV-${refCounter} RE-POST`,
      status: 'pending',
      _meta_category: 'duplicate'
    });

    // Only 1 ledger record exists
    ledgerRecords.push({
      id: `LED-${recId1.substring(0, 8)}`,
      run_id: runId,
      date,
      amount,
      invoice_ref: invoiceRef,
      payee: vendor.name,
      status: 'pending',
      _meta_category: 'duplicate_target'
    });
  }

  // 4. Bank Fees (~5% - bank charges with no ledger counterpart)
  for (let i = 0; i < bankFeeCount; i++) {
    refCounter++;
    const feeAmount = roundTwoDecimals(randomBetween(150, 4500) + [0.0, 0.5, 0.72][randomBetween(0, 2)]);
    const date = getRandomDateInPast(25);
    const utrRef = `UTR-MOCK-${refCounter}`;
    const recId = crypto.randomUUID();

    bankRecords.push({
      id: `BNK-${recId.substring(0, 8)}`,
      run_id: runId,
      date,
      amount: feeAmount,
      utr_ref: utrRef,
      narration: `CHG/${randomChoice(BANK_FEE_DESCRIPTIONS)}/REF-${refCounter}`,
      status: 'pending',
      _meta_category: 'bank_fee'
    });
    // No ledger record created for bank fee
  }

  // 5. Refunds & Reversals (~3% - negative/reverse amounts)
  for (let i = 0; i < refundCount; i++) {
    refCounter++;
    const vendor = randomChoice(VENDORS);
    const amount = roundTwoDecimals(randomBetween(3000, 45000) + Math.random());
    const date = getRandomDateInPast(20);
    const utrRef = `UTR-MOCK-${refCounter}`;
    const invoiceRef = `INV-MOCK-${refCounter}`;
    const recId = crypto.randomUUID();

    // Bank credit/refund
    bankRecords.push({
      id: `BNK-${recId.substring(0, 8)}`,
      run_id: runId,
      date,
      amount: -amount, // Negative / credit reversal
      utr_ref: utrRef,
      narration: `REFUND/CR/${utrRef}/${vendor.prefix}/OVERPAYMENT REVERSAL`,
      status: 'pending',
      _meta_category: 'refund'
    });

    ledgerRecords.push({
      id: `LED-${recId.substring(0, 8)}`,
      run_id: runId,
      date: addDays(date, -2),
      amount: -amount,
      invoice_ref: invoiceRef,
      payee: vendor.name,
      status: 'pending',
      _meta_category: 'refund'
    });
  }

  // 6. Unrecorded Transactions (>= 1 deliberately unrecorded in ledger)
  for (let i = 0; i < unrecordedCount; i++) {
    refCounter++;
    const amount = roundTwoDecimals(randomBetween(25000, 180000) + Math.random());
    const date = getRandomDateInPast(15);
    const utrRef = `UTR-MOCK-${refCounter}`;
    const recId = crypto.randomUUID();

    bankRecords.push({
      id: `BNK-${recId.substring(0, 8)}`,
      run_id: runId,
      date,
      amount,
      utr_ref: utrRef,
      narration: `DIRECT-TRANSFER/MISC-EQUIPMENT-EXPENSE/${utrRef}/UNRECORDED`,
      status: 'pending',
      _meta_category: 'unrecorded'
    });
    // No ledger record created intentionally!
  }

  // Shuffle both arrays so order doesn't leak matching structure
  const shuffle = (array) => array.sort(() => Math.random() - 0.5);

  return {
    runId,
    bankRecords: shuffle(bankRecords),
    ledgerRecords: shuffle(ledgerRecords),
    stats: {
      totalBankRecords: bankRecords.length,
      totalLedgerRecords: ledgerRecords.length,
      exactCount,
      timingLagCount,
      duplicateCount,
      bankFeeCount,
      refundCount,
      unrecordedCount,
    }
  };
}

/**
 * Save synthetic dataset to CSV files
 */
export function exportToCSV(dataset, outputDir = path.join(__dirname, '../data/generated')) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Bank CSV format
  const bankData = dataset.bankRecords.map((r) => ({
    id: r.id,
    date: new Date(r.date).toISOString().split('T')[0],
    amount: r.amount,
    utr_ref: r.utr_ref,
    narration: r.narration,
  }));

  // Ledger CSV format
  const ledgerData = dataset.ledgerRecords.map((r) => ({
    id: r.id,
    date: new Date(r.date).toISOString().split('T')[0],
    amount: r.amount,
    invoice_ref: r.invoice_ref,
    payee: r.payee,
  }));

  const bankCsv = Papa.unparse(bankData);
  const ledgerCsv = Papa.unparse(ledgerData);

  const bankPath = path.join(outputDir, 'bank_statement_mock.csv');
  const ledgerPath = path.join(outputDir, 'internal_ledger_mock.csv');

  fs.writeFileSync(bankPath, bankCsv, 'utf8');
  fs.writeFileSync(ledgerPath, ledgerCsv, 'utf8');

  console.log(`\n[CSV Export Success]`);
  console.log(`- Bank CSV:   ${bankPath} (${bankData.length} records)`);
  console.log(`- Ledger CSV: ${ledgerPath} (${ledgerData.length} records)`);

  return { bankPath, ledgerPath };
}

/**
 * Save synthetic dataset directly to MongoDB
 */
export async function seedToMongoDB(dataset) {
  console.log(`\n[MongoDB Seeding] Connecting to database...`);
  await connectDB();

  try {
    const { runId, bankRecords, ledgerRecords, stats } = dataset;

    console.log(`[MongoDB] Creating Run ${runId}...`);
    await Run.findOneAndUpdate(
      { run_id: runId },
      {
        run_id: runId,
        status: 'pending',
        total_records: bankRecords.length,
        pass1_matched: 0,
        pass2_matched: 0,
        pass3_matched: 0,
        unresolved: 0,
        match_rate: 0.0,
        created_at: new Date(),
        completed_at: null,
      },
      { upsert: true, new: true }
    );

    console.log(`[MongoDB] Inserting ${bankRecords.length} bank records...`);
    const cleanBank = bankRecords.map(({ _meta_category, ...rec }) => rec);
    await BankRecord.insertMany(cleanBank);

    console.log(`[MongoDB] Inserting ${ledgerRecords.length} ledger records...`);
    const cleanLedger = ledgerRecords.map(({ _meta_category, ...rec }) => rec);
    await LedgerRecord.insertMany(cleanLedger);

    // Ensure default demo analyst user exists
    const demoEmail = 'analyst@reconcile.ai';
    const existingUser = await User.findOne({ email: demoEmail });
    if (!existingUser) {
      console.log(`[MongoDB] Creating default demo user (${demoEmail})...`);
      const demoUser = new User({
        email: demoEmail,
        password: 'password123', // Will be hashed by pre-save hook
        role: 'analyst',
      });
      await demoUser.save();
      console.log(`[MongoDB] Demo user created successfully.`);
    }

    console.log(`\n======================================================`);
    console.log(`  RECONCILE.AI SYNTHETIC SEED COMPLETED`);
    console.log(`======================================================`);
    console.log(`  Run ID:                ${runId}`);
    console.log(`  Bank Records:          ${bankRecords.length}`);
    console.log(`  Ledger Records:        ${ledgerRecords.length}`);
    console.log(`  ----------------------------------------------------`);
    console.log(`  - Exact Match Target:  ~${stats.exactCount} records (${Math.round((stats.exactCount/totalCount)*100)}%)`);
    console.log(`  - Timing Lag Target:   ~${stats.timingLagCount} records`);
    console.log(`  - Duplicate Bank Debits: ~${stats.duplicateCount} records`);
    console.log(`  - Bank Fees (No Ledger): ~${stats.bankFeeCount} records`);
    console.log(`  - Refunds & Reversals: ~${stats.refundCount} records`);
    console.log(`  - Unrecorded Txns:     ~${stats.unrecordedCount} records`);
    console.log(`======================================================\n`);

    return { runId, stats };
  } finally {
    await disconnectDB();
  }
}

// CLI Execution Handler
function getRecordCount() {
  const countArg = process.argv.find((arg) => arg.startsWith('--count='));
  if (countArg) {
    const val = parseInt(countArg.split('=')[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  const nIndex = process.argv.indexOf('-n');
  if (nIndex !== -1 && process.argv[nIndex + 1]) {
    const val = parseInt(process.argv[nIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 500;
}

const totalCount = getRecordCount();
const isCsvMode = process.argv.includes('--csv');
const isMongoMode = process.argv.includes('--mongo') || (!isCsvMode && !process.argv.includes('--help'));

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
ReconcileAI Synthetic Seed Generator CLI
Usage:
  node generateSeed.js [options]

Options:
  --count=<N>, -n <N>    Number of base paired records to generate (default: 500)
  --mongo                Seed directly to MongoDB database (default)
  --csv                  Export paired records to CSV files in server/data/generated/
  --help, -h             Show this help message

Examples:
  node generateSeed.js --count=500 --mongo
  node generateSeed.js --count=1000 --csv
  npm run seed
  `);
  process.exit(0);
}

// Execute CLI
const dataset = generateSyntheticDataset(totalCount);

if (isCsvMode) {
  exportToCSV(dataset);
}

if (isMongoMode) {
  seedToMongoDB(dataset).catch((err) => {
    console.error('[CLI Seed Error]:', err);
    process.exit(1);
  });
}

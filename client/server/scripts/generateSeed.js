import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { connectDB, disconnectDB } from '../config/db.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import SettlementReport from '../models/SettlementReport.js';
import SettlementLineItem from '../models/SettlementLineItem.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';
import Run from '../models/Run.js';
import User from '../models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CUSTOMERS = [
  'Acme Tech India Pvt Ltd',
  'Zenith Cloud Solutions',
  'Nexus Logistics LLP',
  'Apex Retail Enterprises',
  'Starlight Media Works',
  'Kaveri Consumer Goods',
  'InfraPulse Networks',
  'BlueHorizon Aerospace',
  'Vanguard Healthcare Systems',
  'Solaria Renewable Energy',
  'MetroMart Groceries',
  'UrbanCraft Furniture',
  'Titan Global Corp',
  'Indus Digital Media',
  'Orion Consulting Partners',
  'Spectra Biotech Labs',
  'Paramount Engineering Works',
  'Hyperion Financial Advisors',
  'Zephyr Apparel Retail',
  'Crestview Automotive Spares',
];

const roundTwoDecimals = (num) => Math.round(num * 100) / 100;
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generates enterprise benchmark dataset for Razorpay Settlement Unpacking
 */
export async function generateRazorpaySeedData(runId = 'RUN-SEED-RAZORPAY-2026') {
  console.log(`\n=== Generating Enterprise Benchmark Dataset for Run: ${runId} ===`);

  const ledgerRecords = [];
  const settlementReports = [];
  const settlementLineItems = [];
  const bankRecords = [];

  const runSlug = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
  const baseDate = new Date('2026-08-01T09:00:00.000Z');
  let orderCounter = 10001;
  let paymentCounter = 20001;
  let setlCounter = 101;

  // We will generate 16 settlement batches totaling 500+ order line items
  const NUM_BATCHES = 16;

  for (let bIdx = 0; bIdx < NUM_BATCHES; bIdx++) {
    const setlId = `setl_${runSlug}_${setlCounter}`;
    const utrNumber = `88290${setlCounter}`;
    const utrRef = `UTR-${runSlug}-${utrNumber}`;
    const batchDayOffset = bIdx * 2; // T+2 cadence
    const txnDate = new Date(baseDate.getTime() + batchDayOffset * 24 * 60 * 60 * 1000);
    const settledDate = new Date(txnDate.getTime() + 2 * 24 * 60 * 60 * 1000); // T+2 settlement date

    const isImbalancedBatch = bIdx === 7; // Deliberate test case: Batch 7 fails Level 1 integrity gate
    const batchOrderCount = randomBetween(26, 36);

    let batchGross = 0;
    let batchFee = 0;
    let batchTax = 0;
    let batchRefund = 0;
    let batchNet = 0;

    const batchLineItems = [];

    for (let oIdx = 0; oIdx < batchOrderCount; oIdx++) {
      const orderId = `ord_${runSlug}_${orderCounter++}`;
      const paymentId = `pay_${runSlug}_${paymentCounter++}`;
      const customer = randomChoice(CUSTOMERS);
      const grossAmount = randomBetween(1200, 38000);

      const isRefund = Math.random() < 0.05; // 5% refund rate
      const isUnrecorded = Math.random() < 0.04; // 4% unrecorded orders (settled but missing in merchant ledger)
      const isPartial = Math.random() < 0.03; // 3% partial settlement discrepancy

      if (isRefund) {
        // Refund line item
        const refundGross = -grossAmount;
        const refundFee = 0;
        const refundTax = 0;
        const refundNet = refundGross;

        batchRefund += grossAmount;
        batchNet += refundNet;

        // Merchant ledger may have customer return entry
        ledgerRecords.push({
          run_id: runId,
          id: `LED-${orderId}`,
          order_id: orderId,
          invoice_ref: orderId,
          date: txnDate,
          amount: refundGross,
          payee: customer,
          status: 'pending',
        });

        batchLineItems.push({
          run_id: runId,
          settlement_id: setlId,
          payment_id: paymentId,
          order_id: orderId,
          type: 'refund',
          amount: refundGross,
          fee: 0,
          tax: 0,
          debit: grossAmount,
          credit: 0,
          net_amount: refundNet,
          currency: 'INR',
          settled_at: settledDate,
          unpacked_status: 'pending',
          variance_category: 'refund_deduction',
        });
      } else {
        // Standard payment
        const mdrFee = roundTwoDecimals(grossAmount * 0.02); // 2.0% MDR
        const gstTax = roundTwoDecimals(mdrFee * 0.18); // 18% GST on MDR
        const netSettled = roundTwoDecimals(grossAmount - mdrFee - gstTax);

        batchGross += grossAmount;
        batchFee += mdrFee;
        batchTax += gstTax;
        batchNet += netSettled;

        if (!isUnrecorded) {
          const ledgerAmount = isPartial ? grossAmount + 1500 : grossAmount; // deliberate discrepancy if partial
          ledgerRecords.push({
            run_id: runId,
            id: `LED-${orderId}`,
            order_id: orderId,
            invoice_ref: orderId,
            date: txnDate,
            amount: ledgerAmount,
            payee: customer,
            status: 'pending',
          });
        }

        batchLineItems.push({
          run_id: runId,
          settlement_id: setlId,
          payment_id: paymentId,
          order_id: orderId,
          type: 'payment',
          amount: grossAmount,
          fee: mdrFee,
          tax: gstTax,
          debit: roundTwoDecimals(mdrFee + gstTax),
          credit: grossAmount,
          net_amount: netSettled,
          currency: 'INR',
          settled_at: settledDate,
          unpacked_status: 'pending',
          variance_category: mdrFee > 0 ? 'mdr_fee' : 'none',
        });
      }
    }

    batchNet = roundTwoDecimals(batchNet);
    batchGross = roundTwoDecimals(batchGross);
    batchFee = roundTwoDecimals(batchFee);
    batchTax = roundTwoDecimals(batchTax);
    batchRefund = roundTwoDecimals(batchRefund);

    // If this is the imbalanced batch test case, artificially alter batch stated total
    const statedSettlementAmount = isImbalancedBatch ? roundTwoDecimals(batchNet - 650.0) : batchNet;

    settlementReports.push({
      run_id: runId,
      settlement_id: setlId,
      amount: statedSettlementAmount,
      gross_amount: batchGross,
      fees: batchFee,
      tax: batchTax,
      refunds: batchRefund,
      utr: utrRef,
      status: 'settled',
      settled_at: settledDate,
      item_count: batchLineItems.length,
      integrity_status: 'pending',
      bank_record_id: `BNK-${runSlug}-${setlCounter}`,
    });

    // 1 Bank credit per settlement batch
    bankRecords.push({
      run_id: runId,
      id: `BNK-${runSlug}-${setlCounter}`,
      date: settledDate,
      amount: statedSettlementAmount,
      utr_ref: utrRef,
      narration: `NEFT CR: HDFC0000060 ${utrRef} RAZORPAY SETTLEMENT ${setlId}`,
      status: 'pending',
    });

    settlementLineItems.push(...batchLineItems);
    setlCounter++;
  }

  // Also add 2 stray bank fee debits to bank statement
  bankRecords.push({
    run_id: runId,
    id: `BNK-FEE-${runSlug}-001`,
    date: new Date('2026-08-15T12:00:00.000Z'),
    amount: -750.0,
    utr_ref: `CHG-${runSlug}-8821`,
    narration: 'CMS MONTHLY MAINTENANCE CHARGES + GST',
    status: 'pending',
  });

  return {
    runId,
    bankRecords,
    settlementReports,
    settlementLineItems,
    ledgerRecords,
  };
}

/**
 * Seeds MongoDB database with generated dataset
 */
export async function seedDatabase() {
  await connectDB();
  const runId = `RUN-SEED-${Date.now().toString(36)}`;

  console.log('Clearing existing database collections...');
  await Run.deleteMany({});
  await BankRecord.deleteMany({});
  await LedgerRecord.deleteMany({});
  await SettlementReport.deleteMany({});
  await SettlementLineItem.deleteMany({});
  await Match.deleteMany({});
  await Exception.deleteMany({});
  await DraftAction.deleteMany({});

  const data = await generateRazorpaySeedData(runId);

  console.log(`Inserting ${data.bankRecords.length} Bank Records (Settlement Credits)...`);
  await BankRecord.insertMany(data.bankRecords);

  console.log(`Inserting ${data.settlementReports.length} Razorpay Settlement Reports...`);
  await SettlementReport.insertMany(data.settlementReports);

  console.log(`Inserting ${data.settlementLineItems.length} Settlement Line Items (Unpacked Orders)...`);
  await SettlementLineItem.insertMany(data.settlementLineItems);

  console.log(`Inserting ${data.ledgerRecords.length} Internal Ledger Orders...`);
  await LedgerRecord.insertMany(data.ledgerRecords);

  const initialRun = await Run.create({
    run_id: runId,
    total_records: data.settlementLineItems.length,
    status: 'pending',
    pass1_matched: 0,
    pass2_matched: 0,
    pass3_matched: 0,
    unresolved: data.settlementLineItems.length,
    match_rate: 0.0,
  });

  console.log(`\n✅ Database seeded successfully with Run ID: ${runId}`);
  console.log(`- Bank Settlement Credits: ${data.bankRecords.length}`);
  console.log(`- Razorpay Settlement Batches: ${data.settlementReports.length}`);
  console.log(`- Granular Order Line Items: ${data.settlementLineItems.length}`);
  console.log(`- Internal Ledger Orders: ${data.ledgerRecords.length}`);

  // Write CSV exports for reference
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, 'bank_statements.csv'),
    Papa.unparse(data.bankRecords)
  );
  fs.writeFileSync(
    path.join(dataDir, 'razorpay_settlements.csv'),
    Papa.unparse(data.settlementReports)
  );
  fs.writeFileSync(
    path.join(dataDir, 'settlement_line_items.csv'),
    Papa.unparse(data.settlementLineItems)
  );
  fs.writeFileSync(
    path.join(dataDir, 'ledger_orders.csv'),
    Papa.unparse(data.ledgerRecords)
  );

  await disconnectDB();
  return { runId, data };
}

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed Error:', err);
      process.exit(1);
    });
}

import { generateRazorpaySeedData } from './generateSeed.js';
import { reconcileLevel0, reconcileLevel1, reconcileLevel2 } from '../services/matchingEngine.js';

console.log('--- Starting 3-Level Razorpay Settlement Unpacking Benchmark Run ---');
const startTime = performance.now();

const data = await generateRazorpaySeedData('BENCHMARK-RUN-2026');
const genTime = performance.now();

// Level 0: Bank Credit -> Settlement Batch
const l0 = reconcileLevel0(data.bankRecords, data.settlementReports, { runId: 'BENCHMARK-RUN-2026' });

// Level 1: Settlement Batch Integrity Gate
const l1 = reconcileLevel1(data.settlementReports, data.settlementLineItems, { runId: 'BENCHMARK-RUN-2026' });

// Level 2: Line-Item -> Internal Order Unpacking
const l2 = reconcileLevel2(data.settlementLineItems, data.ledgerRecords, l1.balancedSettlementIds, { runId: 'BENCHMARK-RUN-2026' });

const endTime = performance.now();

const totalLineItems = data.settlementLineItems.length;
const totalSettlements = data.settlementReports.length;
const totalBankCredits = data.bankRecords.length;

const l0Matched = l0.matches.length;
const l1Balanced = l1.matches.length;
const l1Imbalanced = l1.exceptions.filter((e) => e.category === 'batch_imbalance').length;

const l2Matched = l2.matches.length;
const l2Exceptions = l2.exceptions;

const allExceptions = [...l0.exceptions, ...l1.exceptions, ...l2.exceptions];

let totalMdrFees = 0;
let totalGstItc = 0;
for (const li of data.settlementLineItems) {
  totalMdrFees += Number(li.fee) || 0;
  totalGstItc += Number(li.tax) || 0;
}

const matchRate = ((l2Matched / totalLineItems) * 100).toFixed(1);

console.log(`
================================================================================
  ReconcileAI — 3-Level Razorpay Settlement Unpacking Engine Report
================================================================================
Input Dataset:
- Bank Settlement Credits:         ${totalBankCredits}
- Razorpay Settlement Batches:     ${totalSettlements}
- Constituent Order Line Items:    ${totalLineItems}
- Internal Ledger Orders:          ${data.ledgerRecords.length}

Level 0: Bank Credit ↔ Settlement Batch Match:
- Matched via UTR & Net Amount:    ${l0Matched} / ${totalBankCredits} (${((l0Matched / totalBankCredits) * 100).toFixed(1)}%)

Level 1: Settlement Batch Integrity Gate (Σ line items == bank credit):
- Cryptographically Balanced:      ${l1Balanced} batches
- Flagged Batch Imbalances:        ${l1Imbalanced} batch (Integrity gate blocked unpacking)

Level 2: Order-Level Unpacking & ITC Categorization:
- Successfully Unpacked & Matched: ${l2Matched} / ${totalLineItems} (${matchRate}%)
- Line-Item Exceptions / Variances:${l2Exceptions.length} (${((l2Exceptions.length / totalLineItems) * 100).toFixed(1)}%)

Variance Breakdown (Level 2 & Integrity Gate):
- Batch Imbalances:                ${allExceptions.filter((e) => e.category === 'batch_imbalance').length}
- Unrecorded Orders:               ${allExceptions.filter((e) => e.category === 'unrecorded').length}
- Partial Settlements:             ${allExceptions.filter((e) => e.category === 'partial_settlement').length}
- Refund Deductions:               ${l2.matches.filter((m) => m.variance_category === 'refund_deduction').length} unpacked
- MDR Fee Deductions (2%):         ${l2.matches.filter((m) => m.variance_category === 'mdr_fee').length} unpacked

Financial Summary:
- Total MDR Fees Unpacked:         ₹${totalMdrFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
- Claimable GST Input Tax Credit:  ₹${totalGstItc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

Execution Performance:
- Data Generation Time:            ${(genTime - startTime).toFixed(2)} ms
- 3-Level Matching Time:           ${(endTime - genTime).toFixed(2)} ms
- Total Pipeline Runtime:          ${(endTime - startTime).toFixed(2)} ms
================================================================================
`);

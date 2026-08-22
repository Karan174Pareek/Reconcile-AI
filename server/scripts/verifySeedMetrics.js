import { generateSyntheticDataset } from './generateSeed.js';
import { reconcileRecords } from '../services/matchingEngine.js';

console.log('--- Starting 500-Record Synthetic Seed Benchmark Run ---');
const startTime = performance.now();

// 1. Generate 500 synthetic paired records
const dataset = generateSyntheticDataset(500, 'BENCHMARK-RUN');
const { bankRecords, ledgerRecords } = dataset;
const genTime = performance.now();

// 2. Execute Deterministic & Fuzzy Matching (Pass 1 & Pass 2)
const { matches, exceptions, stats } = reconcileRecords(bankRecords, ledgerRecords);
const endTime = performance.now();

const totalExecutionTimeMs = (endTime - startTime).toFixed(2);
const matchingTimeMs = (endTime - genTime).toFixed(2);

const total = bankRecords.length;
const pass1Count = stats.pass1_matched;
const pass2Count = stats.pass2_matched;
const exceptionCount = exceptions.length;

const pass1Pct = ((pass1Count / total) * 100).toFixed(1);
const pass2Pct = ((pass2Count / total) * 100).toFixed(1);
const unresolvedPct = ((exceptionCount / total) * 100).toFixed(1);
const matchedTotal = pass1Count + pass2Count;
const initialMatchRate = ((matchedTotal / total) * 100).toFixed(1);

console.log(`
======================================================
  ReconcileAI Benchmark Verification Report
======================================================
Total Records Processed:      ${total} paired rows
Pass 1 (Exact Deterministic): ${pass1Count} (${pass1Pct}%)
Pass 2 (Fuzzy & Heuristics):   ${pass2Count} (${pass2Pct}%)
Unresolved / Exceptions:       ${exceptionCount} (${unresolvedPct}%)
Initial Match Rate (P1 + P2):  ${initialMatchRate}%

Exception Categories Breakdown:
- Duplicates:   ${exceptions.filter((e) => e.category === 'duplicate').length}
- Timing Lag:   ${exceptions.filter((e) => e.category === 'timing_lag').length}
- Bank Fees:    ${exceptions.filter((e) => e.category === 'bank_fee').length}
- Refunds:      ${exceptions.filter((e) => e.category === 'refund').length}
- Unrecorded:   ${exceptions.filter((e) => e.category === 'unrecorded').length}
- Unknown/Other: ${exceptions.filter((e) => e.category === 'unknown').length}

Execution Timings:
- Total Pipeline Time:        ${totalExecutionTimeMs} ms (~${(totalExecutionTimeMs / 1000).toFixed(3)}s)
- Pure Matching Engine Time:  ${matchingTimeMs} ms
======================================================
`);

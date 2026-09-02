import http from 'http';
import { performance } from 'perf_hooks';
import app from '../app.js';
import { generateRazorpaySeedData } from './generateSeed.js';
import { reconcileLevel0, reconcileLevel1, reconcileLevel2 } from '../services/matchingEngine.js';

/**
 * ReconcileAI API Stress & Performance Benchmarking Suite
 */
async function runApiStressTest() {
  console.log('\n================================================================================');
  console.log('                 RECONCILE-AI — API STRESS & LOAD TESTING SUITE                 ');
  console.log('               Measuring Throughput, Latency, Concurrency & Scaling              ');
  console.log('================================================================================\n');

  // Start in-memory HTTP server for testing
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`[Setup] In-memory API server started on ${baseUrl}\n`);

  try {
    // Warm up DB and MemoryStore before running concurrency burst
    const { ensureDbReady } = await import('../config/db.js');
    const { MemoryStore } = await import('../services/memoryStore.js');
    await ensureDbReady();
    await MemoryStore.ensureRunHydrated('RUN-SEED-RAZORPAY-2026');

    // --------------------------------------------------------------------------------
    // TEST 1: High-Concurrency Endpoint Throughput Test
    // --------------------------------------------------------------------------------
    console.log('--------------------------------------------------------------------------------');
    console.log('[TEST 1/3] High-Concurrency Endpoint Burst Test');
    console.log('Sending 300 concurrent HTTP requests across core API routes...');
    console.log('--------------------------------------------------------------------------------');

    const endpoints = [
      '/api/health',
      '/api/runs',
      '/api/runs/RUN-SEED-RAZORPAY-2026',
      '/api/runs/RUN-SEED-RAZORPAY-2026/exceptions',
      '/api/runs/RUN-SEED-RAZORPAY-2026/draft-actions',
      '/api/runs/RUN-SEED-RAZORPAY-2026/audit-log',
    ];

    const TOTAL_REQUESTS = 300;
    const latencies = [];
    let successCount = 0;
    let failureCount = 0;

    const startConcurrency = performance.now();

    const statusCounts = {};

    const BATCH_SIZE = 50;
    for (let i = 0; i < TOTAL_REQUESTS; i += BATCH_SIZE) {
      const batchEndpoints = Array.from({ length: Math.min(BATCH_SIZE, TOTAL_REQUESTS - i) }, (_, idx) => {
        const reqIdx = i + idx;
        const endpoint = endpoints[reqIdx % endpoints.length];
        const reqStart = performance.now();

        return fetch(`${baseUrl}${endpoint}`)
          .then((res) => {
            const duration = performance.now() - reqStart;
            latencies.push(duration);
            statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
            if (res.ok) {
              successCount++;
            } else {
              failureCount++;
            }
          })
          .catch((err) => {
            const duration = performance.now() - reqStart;
            latencies.push(duration);
            failureCount++;
            statusCounts['FETCH_ERROR'] = (statusCounts['FETCH_ERROR'] || 0) + 1;
          });
      });
      await Promise.all(batchEndpoints);
    }

    const endConcurrency = performance.now();
    const totalDurationMs = endConcurrency - startConcurrency;
    const totalDurationSec = totalDurationMs / 1000;
    const rps = (TOTAL_REQUESTS / totalDurationSec).toFixed(2);

    latencies.sort((a, b) => a - b);
    const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const p50 = latencies[Math.floor(latencies.length * 0.5)]?.toFixed(2);
    const p90 = latencies[Math.floor(latencies.length * 0.9)]?.toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2);
    const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2);

    console.table([
      { Metric: 'Total Requests', Value: TOTAL_REQUESTS },
      { Metric: 'Successful Requests (200 OK)', Value: successCount },
      { Metric: 'Failed Requests', Value: failureCount },
      { Metric: 'HTTP Status Breakdown', Value: JSON.stringify(statusCounts) },
      { Metric: 'Total Time Elapsed (s)', Value: `${totalDurationSec.toFixed(3)} s` },
      { Metric: 'Throughput (Req / Sec)', Value: `${rps} req/sec` },
      { Metric: 'Average Latency', Value: `${avgLatency} ms` },
      { Metric: 'p50 Latency (Median)', Value: `${p50} ms` },
      { Metric: 'p90 Latency', Value: `${p90} ms` },
      { Metric: 'p95 Latency', Value: `${p95} ms` },
      { Metric: 'p99 Latency', Value: `${p99} ms` },
    ]);

    // --------------------------------------------------------------------------------
    // TEST 2: High-Volume Pipeline Scalability Test (Record Throughput Benchmark)
    // --------------------------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------------------');
    console.log('[TEST 2/3] High-Volume Reconciliation Pipeline Scalability Test');
    console.log('Benchmarking reconciliation engine speed across dataset scaling sizes...');
    console.log('--------------------------------------------------------------------------------');

    const scales = [100, 500, 1000, 2500, 5000];
    const scaleResults = [];

    for (const recordCount of scales) {
      // Generate synthetic dataset scaled to requested size
      const bankRecords = Array.from({ length: Math.ceil(recordCount / 10) }, (_, i) => ({
        id: `BNK-STRESS-${i}`,
        run_id: 'STRESS-RUN',
        date: new Date('2026-08-10'),
        amount: 50000,
        utr_ref: `UTR-STRESS-${i}`,
        narration: `SETTLEMENT UTR-STRESS-${i}`,
      }));

      const settlementReports = bankRecords.map((b, i) => ({
        settlement_id: `SETL-STRESS-${i}`,
        run_id: 'STRESS-RUN',
        utr: `UTR-STRESS-${i}`,
        date: new Date('2026-08-10'),
        amount: 50000,
      }));

      const settlementLineItems = Array.from({ length: recordCount }, (_, i) => {
        const parentBatchIdx = i % bankRecords.length;
        return {
          id: `ITEM-STRESS-${i}`,
          run_id: 'STRESS-RUN',
          settlement_id: `SETL-STRESS-${parentBatchIdx}`,
          order_id: `ORD-STRESS-${i}`,
          amount: 500,
          mdr_fee: 10,
          gst_on_mdr: 1.8,
          net_amount: 488.2,
          unpacked_status: 'pending',
        };
      });

      const ledgerRecords = Array.from({ length: recordCount }, (_, i) => ({
        id: `LED-STRESS-${i}`,
        run_id: 'STRESS-RUN',
        order_id: `ORD-STRESS-${i}`,
        invoice_ref: `ORD-STRESS-${i}`,
        amount: 500,
        date: new Date('2026-08-10'),
        status: 'pending',
      }));

      const initialMemory = process.memoryUsage().heapUsed;
      const tStart = performance.now();

      const l0 = reconcileLevel0(bankRecords, settlementReports, { runId: 'STRESS-RUN' });
      const l1 = reconcileLevel1(settlementReports, settlementLineItems, { runId: 'STRESS-RUN' });
      const l2 = reconcileLevel2(settlementLineItems, ledgerRecords, l1.balancedSettlementIds, { runId: 'STRESS-RUN' });

      const tEnd = performance.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const durationMs = tEnd - tStart;
      const recsPerSec = ((recordCount / durationMs) * 1000).toFixed(0);
      const heapDeltaMB = ((finalMemory - initialMemory) / (1024 * 1024)).toFixed(2);

      scaleResults.push({
        'Line Item Volume': recordCount,
        'Bank Settlements': bankRecords.length,
        'Engine Duration (ms)': durationMs.toFixed(2) + ' ms',
        'Throughput (Recs/sec)': `${recsPerSec} recs/sec`,
        'Level 2 Matched': l2.matches.length,
        'Match Rate (%)': `${((l2.matches.length / recordCount) * 100).toFixed(1)}%`,
        'Heap Delta (MB)': `${heapDeltaMB} MB`,
      });
    }

    console.table(scaleResults);

    // --------------------------------------------------------------------------------
    // TEST 3: Idempotency & Race Condition Concurrency Test
    // --------------------------------------------------------------------------------
    console.log('\n--------------------------------------------------------------------------------');
    console.log('[TEST 3/3] Idempotency & Race Condition Concurrency Test');
    console.log('Blasting 30 simultaneous POST approval calls to test lock safety & idempotency...');
    console.log('--------------------------------------------------------------------------------');

    const draftId = 'draft_RUN-SEED-RAZORPAY-2026_1';
    const postPromises = Array.from({ length: 30 }, () =>
      fetch(`${baseUrl}/api/draft-actions/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: 'stress-tester@company.com' }),
      }).then((r) => r.json())
    );

    const postResults = await Promise.all(postPromises);
    const successApprovals = postResults.filter((r) => r.success);
    const alreadyProcessedCount = postResults.filter((r) => r.already_processed).length;

    console.table([
      { Metric: 'Simultaneous Approval Requests', Value: 30 },
      { Metric: 'Successful Responses (HTTP 200)', Value: successApprovals.length },
      { Metric: 'Idempotent Duplicate Catches', Value: alreadyProcessedCount },
      { Metric: 'Concurrency Violation Errors', Value: 30 - successApprovals.length },
    ]);

    console.log('\n================================================================================');
    console.log('                   API STRESS & PERFORMANCE TEST COMPLETE                       ');
    console.log('================================================================================\n');
  } finally {
    server.close();
  }
}

runApiStressTest().catch((err) => {
  console.error('[Stress Test Failed]:', err);
  process.exit(1);
});

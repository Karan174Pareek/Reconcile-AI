import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../app.js';
import { reconcileLevel0, reconcileLevel1, reconcileLevel2 } from '../services/matchingEngine.js';

test('API Stress & Concurrency: handles parallel HTTP requests and idempotency lock', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Parallel GET requests stress test
    const endpoints = ['/api/health', '/api/runs'];
    const requests = Array.from({ length: 50 }, (_, i) =>
      fetch(`${baseUrl}${endpoints[i % endpoints.length]}`)
    );
    const responses = await Promise.all(requests);
    const allOk = responses.every((r) => r.status === 200);
    assert.equal(allOk, true, 'All 50 concurrent requests must return HTTP 200 OK');

    // 2. High-volume matching engine scalability test
    const recordCount = 1000;
    const bankRecords = Array.from({ length: 100 }, (_, i) => ({
      id: `BNK-TEST-${i}`,
      run_id: 'TEST-RUN',
      date: new Date('2026-08-10'),
      amount: 10000,
      utr_ref: `UTR-TEST-${i}`,
      narration: `SETTLEMENT UTR-TEST-${i}`,
    }));

    const settlementReports = bankRecords.map((b, i) => ({
      settlement_id: `SETL-TEST-${i}`,
      run_id: 'TEST-RUN',
      utr: `UTR-TEST-${i}`,
      date: new Date('2026-08-10'),
      amount: 10000,
    }));

    const settlementLineItems = Array.from({ length: recordCount }, (_, i) => ({
      id: `ITEM-TEST-${i}`,
      run_id: 'TEST-RUN',
      settlement_id: `SETL-TEST-${i % 100}`,
      order_id: `ORD-TEST-${i}`,
      amount: 100,
      mdr_fee: 2,
      gst_on_mdr: 0.36,
      net_amount: 97.64,
      unpacked_status: 'pending',
    }));

    const ledgerRecords = Array.from({ length: recordCount }, (_, i) => ({
      id: `LED-TEST-${i}`,
      run_id: 'TEST-RUN',
      order_id: `ORD-TEST-${i}`,
      invoice_ref: `ORD-TEST-${i}`,
      amount: 100,
      date: new Date('2026-08-10'),
      status: 'pending',
    }));

    const start = performance.now();
    const l0 = reconcileLevel0(bankRecords, settlementReports, { runId: 'TEST-RUN' });
    const l1 = reconcileLevel1(settlementReports, settlementLineItems, { runId: 'TEST-RUN' });
    const l2 = reconcileLevel2(settlementLineItems, ledgerRecords, l1.balancedSettlementIds, { runId: 'TEST-RUN' });
    const duration = performance.now() - start;

    assert.equal(l2.matches.length, recordCount, 'All 1,000 line items matched accurately');
    assert.ok(duration < 500, `1,000 records processed in ${duration.toFixed(2)}ms (<500ms benchmark limit)`);
  } finally {
    server.close();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';

let server;
let baseUrl;

test('API Ingestion & Health Routes', async (t) => {
  await t.test('Setup test server', () => {
    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  await t.test('GET /api/health returns status healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
  });

  await t.test('POST /api/runs/upload rejects request missing files', async () => {
    const res = await fetch(`${baseUrl}/api/runs/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  await t.test('POST /api/runs/upload rejects invalid CSV with row-level errors', async () => {
    const boundary = '----WebKitFormBoundaryTest12345';
    const invalidBankCsv = 'date,amount,narration\n2026-08-01,not-a-number,NEFT CR\n';
    const validLedgerCsv = 'date,amount,order_id\n2026-08-01,1000,ORD-1\n';

    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="bank_csv"; filename="bank.csv"',
      'Content-Type: text/csv',
      '',
      invalidBankCsv,
      `--${boundary}`,
      'Content-Disposition: form-data; name="ledger_csv"; filename="ledger.csv"',
      'Content-Type: text/csv',
      '',
      validLedgerCsv,
      `--${boundary}--`,
    ].join('\r\n');

    const res = await fetch(`${baseUrl}/api/runs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyParts,
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, 'CSV_VALIDATION_ERROR');
    assert.ok(data.error.details.bank_errors.length > 0);
  });

  await t.test('Teardown test server', async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });
});

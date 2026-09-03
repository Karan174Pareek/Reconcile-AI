import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../app.js';
import { MemoryStore } from '../services/memoryStore.js';
import { disconnectDB } from '../config/db.js';

let server;
let baseUrl;

test('Security Hardening & Resilience Suite', async (t) => {
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

  await t.test('CORS: rejects unauthorized external origin without echoing it back', async () => {
    const maliciousOrigin = 'https://malicious-site.com';
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        Origin: maliciousOrigin,
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notEqual(allowOrigin, maliciousOrigin);
  });

  await t.test('Auth: prevents privilege escalation on public registration', async () => {
    const randomEmail = `test_sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'Password123!',
        role: 'admin',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.data?.user);
    assert.equal(data.data.user.role, 'analyst');
  });

  await t.test('Audit Log: preserves event history on successive writes', async () => {
    const testRunId = `RUN-AUDIT-SEC-${Date.now()}`;
    MemoryStore.saveRun({ run_id: testRunId, status: 'complete', total_records: 10 });

    const res1 = await fetch(`${baseUrl}/api/runs/${testRunId}/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'security_auditor',
        action: 'first_action',
        target_type: 'run',
        target_id: testRunId,
        details: { note: 'event 1' },
      }),
    });
    assert.equal(res1.status, 201);

    const res2 = await fetch(`${baseUrl}/api/runs/${testRunId}/audit-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: 'security_auditor',
        action: 'second_action',
        target_type: 'run',
        target_id: testRunId,
        details: { note: 'event 2' },
      }),
    });
    assert.equal(res2.status, 201);

    const logsRes = await fetch(`${baseUrl}/api/runs/${testRunId}/audit-log`);
    assert.equal(logsRes.status, 200);
    const logsData = await logsRes.json();
    assert.ok(Array.isArray(logsData.data));
    assert.ok(logsData.data.length >= 2);
    const actions = logsData.data.map((l) => l.action);
    assert.ok(actions.includes('first_action'));
    assert.ok(actions.includes('second_action'));
  });

  await t.test('Exceptions: returns 404 EXCEPTION_NOT_FOUND when resolving non-existent exception', async () => {
    const res = await fetch(`${baseUrl}/api/exceptions/NON_EXISTENT_EXC/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'accepted',
        notes: 'Testing 404',
      }),
    });

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error.code, 'EXCEPTION_NOT_FOUND');
  });

  await t.test('Draft Actions: returns 404 DRAFT_ACTION_NOT_FOUND when approving non-existent action', async () => {
    const res = await fetch(`${baseUrl}/api/draft-actions/NON_EXISTENT_DRAFT/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error.code, 'DRAFT_ACTION_NOT_FOUND');
  });

  await t.test('Teardown test server', async () => {
    await disconnectDB();
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });
});

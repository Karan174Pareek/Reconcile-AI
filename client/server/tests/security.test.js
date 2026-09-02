import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../app.js';

let server;
let baseUrl;

test('Security and audit regressions', async (t) => {
  await t.test('setup', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  await t.test('rejects untrusted CORS origins', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://attacker.example' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });

  await t.test('public registration cannot self-assign admin role', async () => {
    const email = `security-${Date.now()}@example.test`;
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'password-123', role: 'admin' }),
    });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.equal(payload.data.user.role, 'analyst');
  });

  await t.test('posted audit events preserve previous in-memory events', async () => {
    const runId = `RUN-AUDIT-${Date.now()}`;
    const headers = { 'content-type': 'application/json' };
    for (const action of ['first_event', 'second_event']) {
      const response = await fetch(`${baseUrl}/api/runs/${runId}/audit-log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ actor: 'tester', action, target_type: 'match', target_id: action }),
      });
      assert.equal(response.status, 201);
    }
    const response = await fetch(`${baseUrl}/api/runs/${runId}/audit-log`);
    const payload = await response.json();
    assert.equal(payload.count, 2);
    assert.deepEqual(payload.data.map((event) => event.action), ['second_event', 'first_event']);
  });

  await t.test('unknown mutation targets return not found', async () => {
    const exceptionResponse = await fetch(`${baseUrl}/api/exceptions/does-not-exist/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'accepted' }),
    });
    assert.equal(exceptionResponse.status, 404);

    const draftResponse = await fetch(`${baseUrl}/api/draft-actions/does-not-exist/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(draftResponse.status, 404);
  });

  await t.test('teardown', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});

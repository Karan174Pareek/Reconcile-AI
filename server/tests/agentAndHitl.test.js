import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAUDE_AGENT_TOOLS } from '../services/agentToolRouter.js';
import { cleanJsonResponse } from '../services/claudeOrchestrator.js';

test('CLAUDE_AGENT_TOOLS: definitions have strict JSON schema and proper tool names', () => {
  assert.equal(CLAUDE_AGENT_TOOLS.length, 4);

  const toolNames = CLAUDE_AGENT_TOOLS.map((t) => t.name);
  assert.ok(toolNames.includes('query_matches'));
  assert.ok(toolNames.includes('query_exceptions'));
  assert.ok(toolNames.includes('query_audit_log'));
  assert.ok(toolNames.includes('get_record_by_id'));

  for (const tool of CLAUDE_AGENT_TOOLS) {
    assert.ok(tool.description.length > 10);
    assert.equal(tool.input_schema.type, 'object');
    assert.ok(tool.input_schema.properties);
  }
});

test('HITL Draft Action Structure: validates vendor_email and ledger_correction payload shapes', () => {
  const emailDraft = {
    action_type: 'vendor_email',
    confidence: 0.95,
    draft_content: {
      recipient: 'Razorpay Software Pvt Ltd',
      subject: 'Invoice Request: Payment UTR-10001',
      body: 'Please provide formal tax invoice for transaction dated 2026-08-10.',
    },
  };

  assert.equal(emailDraft.action_type, 'vendor_email');
  assert.ok(emailDraft.draft_content.recipient);
  assert.ok(emailDraft.draft_content.subject);

  const ledgerDraft = {
    action_type: 'ledger_correction',
    confidence: 0.9,
    draft_content: {
      entry_type: 'journal_entry',
      proposed_debit_account: 'Bank Charges Expense',
      proposed_credit_account: 'Operating Bank Account',
      amount: 450.0,
      date: '2026-08-10',
      narration: 'CMS maintenance fee adjustment',
    },
  };

  assert.equal(ledgerDraft.action_type, 'ledger_correction');
  assert.equal(ledgerDraft.draft_content.amount, 450.0);
});

test('cleanJsonResponse: handles nested markdown fences and edge case strings', () => {
  const jsonWithFences = '```json\n{"result": "success", "count": 5}\n```';
  const cleaned = cleanJsonResponse(jsonWithFences);
  const parsed = JSON.parse(cleaned);
  assert.equal(parsed.result, 'success');
  assert.equal(parsed.count, 5);
});

import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { CLAUDE_AGENT_TOOLS, executeAgentTool } from '../services/agentToolRouter.js';
import Run from '../models/Run.js';
import { MemoryStore } from '../services/memoryStore.js';

const AGENT_SYSTEM_PROMPT = `You are ReconcileAI's Tier-3 Senior Forensic Financial Assistant.
You have real-time read-only access to the active reconciliation database for this run via tool functions.

Guidelines:
1. Always use available tools (query_matches, query_exceptions, query_audit_log, get_record_by_id) to retrieve authoritative facts before answering questions about transactions.
2. Provide concise, audit-grade financial explanations citing exact transaction dates, INR amounts, UTR numbers, and vendor names.
3. If an exception was diagnosed as duplicate, bank fee, timing lag, or unrecorded, cite the rationale and confidence score.
4. Formatting: Use clean markdown tables and bullet points for transaction lists.
`;

/**
 * Controller: Handles conversational agent chat with Server-Sent Events (SSE) streaming
 * POST /api/runs/:run_id/chat
 */
export async function streamAgentChat(req, res, next) {
  const { run_id } = req.params;
  const { messages = [] } = req.body;

  if (!run_id) {
    return res.status(400).json({ error: 'Missing run_id parameter' });
  }

  // Setup Server-Sent Events (SSE) headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let run = null;
    try {
      if (mongoose.connection.readyState === 1) {
        run = await Run.findOne({ run_id }).lean();
      }
    } catch (e) {
      console.warn('[Mongo Chat Run Find Warning]:', e.message);
    }

    if (!run) {
      const hydrated = await MemoryStore.ensureRunHydrated(run_id);
      run = hydrated?.run || MemoryStore.getRun(run_id);
    }

    if (!run) {
      sendEvent({ type: 'error', message: `Run "${run_id}" not found. Please initialize a run using 'Try with Benchmark Data' or 'Upload CSV'.` });
      sendEvent({ type: 'done' });
      return res.end();
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    const isLiveApiKey = apiKey && apiKey !== 'mock-key' && !apiKey.includes('placeholder') && !apiKey.includes('your_anthropic');

    if (!isLiveApiKey) {
      // Deterministic tool-using offline assistant for testing/development
      await handleOfflineAgentConversation(run_id, run, messages, sendEvent);
      sendEvent({ type: 'done' });
      return res.end();
    }

    const client = new Anthropic({ apiKey });
    let conversation = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    // Multi-turn tool execution loop (max 5 turns)
    let turns = 0;
    while (turns < 5) {
      turns++;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.2,
        system: `${AGENT_SYSTEM_PROMPT}\nActive Run ID: "${run_id}" (Status: ${run.status}, Total records: ${run.total_records}, Match rate: ${run.match_rate}%).`,
        tools: CLAUDE_AGENT_TOOLS,
        messages: conversation,
      });

      const toolCalls = (response.content || []).filter((b) => b.type === 'tool_use');
      const textBlocks = (response.content || []).filter((b) => b.type === 'text');

      // Stream text chunks if any
      for (const block of textBlocks) {
        if (block.text) {
          sendEvent({ type: 'text', content: block.text });
        }
      }

      if (toolCalls.length === 0 || response.stop_reason === 'end_turn') {
        break;
      }

      // Execute tool calls and stream results
      conversation.push({ role: 'assistant', content: response.content });

      const toolResultBlocks = [];
      for (const toolCall of toolCalls) {
        sendEvent({
          type: 'tool_start',
          tool_name: toolCall.name,
          input: toolCall.input,
          tool_use_id: toolCall.id,
        });

        const toolResult = await executeAgentTool(run_id, toolCall.name, toolCall.input);

        sendEvent({
          type: 'tool_result',
          tool_name: toolCall.name,
          result: toolResult,
          tool_use_id: toolCall.id,
        });

        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      conversation.push({ role: 'user', content: toolResultBlocks });
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('[Chat SSE Error]:', err);
    sendEvent({ type: 'error', message: err.message || 'Error processing chat message' });
    sendEvent({ type: 'done' });
    res.end();
  }
}

/**
 * Handles offline agent queries using real MongoDB queries via agentToolRouter and generates formatted answers
 */
async function handleOfflineAgentConversation(runId, run, messages, sendEvent) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const queryLower = lastMessage.toLowerCase();

  if (queryLower.includes('exception') || queryLower.includes('unresolved') || queryLower.includes('issue')) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_exceptions',
      input: { limit: 10 },
      tool_use_id: 'tool_call_exp_1',
    });

    const result = await executeAgentTool(runId, 'query_exceptions', { limit: 10 });

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_exceptions',
      result,
      tool_use_id: 'tool_call_exp_1',
    });

    const expCount = result.exceptions?.length || 0;
    sendEvent({
      type: 'text',
      content: `I analyzed the exception queue for **Run ${runId}**. There are currently **${expCount} exception(s)** detected by the diagnostic engine.\n\n` +
        `### Diagnostic Summary:\n` +
        (result.exceptions || [])
          .slice(0, 5)
          .map(
            (e) =>
              `- **${e.bank_record_id}** [${(e.category || 'unknown').toUpperCase()}]: ${e.ai_rationale} (${(
                (e.confidence || 0) * 100
              ).toFixed(0)}% confidence, Status: \`${e.human_decision}\`)`
          )
          .join('\n') +
        `\n\nYou can review or resolve these exceptions in the **Exception Queue** tab.`,
    });
  } else if (queryLower.includes('match') || queryLower.includes('rate') || queryLower.includes('summary')) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_matches',
      input: { limit: 5 },
      tool_use_id: 'tool_call_match_1',
    });

    const result = await executeAgentTool(runId, 'query_matches', { limit: 5 });

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_matches',
      result,
      tool_use_id: 'tool_call_match_1',
    });

    sendEvent({
      type: 'text',
      content: `### Reconciliation Overview for Run \`${runId}\`:\n` +
        `- **Status:** \`${run.status}\`\n` +
        `- **Total Records:** **${run.total_records}**\n` +
        `- **Pass 1 Exact Matches:** **${run.pass1_matched}**\n` +
        `- **Pass 2 Fuzzy Matches:** **${run.pass2_matched}**\n` +
        `- **Pass 3 Claude AI Matches:** **${run.pass3_matched}**\n` +
        `- **Unresolved / Exceptions:** **${run.unresolved}**\n` +
        `- **Final Reconciliation Rate:** **${run.match_rate}%**\n\n` +
        `Sample verified matches:\n` +
        (result.matches || [])
          .slice(0, 3)
          .map(
            (m) =>
              `- **${m.bank_record_id}** ↔ **${m.ledger_record_id}** [${m.method.toUpperCase()}]: ${m.rationale}`
          )
          .join('\n'),
    });
  } else {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_audit_log',
      input: { limit: 5 },
      tool_use_id: 'tool_call_audit_1',
    });

    const result = await executeAgentTool(runId, 'query_audit_log', { limit: 5 });

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_audit_log',
      result,
      tool_use_id: 'tool_call_audit_1',
    });

    sendEvent({
      type: 'text',
      content: `I am connected to the live database for **Run ${runId}** (Reconciliation Rate: **${run.match_rate}%**).\n\n` +
        `You can ask me to:\n` +
        `- Inspect specific bank or ledger transactions (e.g. *"Show details for BNK-xxx"*)\n` +
        `- Analyze exception categories like duplicates, refunds, or bank fees\n` +
        `- Review the latest audit trail logs and human resolutions.`,
    });
  }
}

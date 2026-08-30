import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { CLAUDE_AGENT_TOOLS, GEMINI_AGENT_TOOLS, executeAgentTool } from '../services/agentToolRouter.js';
import Run from '../models/Run.js';
import { MemoryStore } from '../services/memoryStore.js';
import { getSanitizedAnthropicKey, getSanitizedGeminiKey } from '../services/claudeOrchestrator.js';

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

  const lastUserMsg = Array.isArray(messages) ? messages[messages.length - 1]?.content : '';
  if (!lastUserMsg || typeof lastUserMsg !== 'string' || !lastUserMsg.trim()) {
    sendEvent({ type: 'error', message: 'Chat prompt cannot be empty or blank. Please ask a valid question.' });
    sendEvent({ type: 'done' });
    return res.end();
  }

  let run = null;

  try {
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

    const anthropicKey = getSanitizedAnthropicKey();
    const geminiKey = getSanitizedGeminiKey();

    // Tier 1: Try Claude if key is configured
    if (anthropicKey) {
      try {
        const client = new Anthropic({ apiKey: anthropicKey });
        let conversation = messages.map((m) => {
          let content = m.content;
          if (typeof content === 'string') {
            return { role: m.role === 'assistant' ? 'assistant' : 'user', content };
          }
          if (Array.isArray(content)) {
            const textParts = content
              .filter((block) => block.type === 'text')
              .map((block) => block.text);
            return {
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: textParts.length > 0 ? textParts.join('\n') : JSON.stringify(content),
            };
          }
          return { role: m.role === 'assistant' ? 'assistant' : 'user', content: JSON.stringify(content) };
        });

        let turns = 0;
        let engineInfoSent = false;
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

          if (!engineInfoSent) {
            sendEvent({
              type: 'engine_info',
              engine: 'claude',
              engine_name: 'Claude AI Auditor',
            });
            engineInfoSent = true;
          }

          const toolCalls = (response.content || []).filter((b) => b.type === 'tool_use');
          const textBlocks = (response.content || []).filter((b) => b.type === 'text');

          for (const block of textBlocks) {
            if (block.text) {
              sendEvent({ type: 'text', content: block.text });
            }
          }

          if (toolCalls.length === 0 || response.stop_reason === 'end_turn') {
            break;
          }

          conversation.push({ role: 'assistant', content: response.content });

          const toolResultBlocks = [];
          for (const toolCall of toolCalls) {
            sendEvent({
              type: 'tool_start',
              tool_name: toolCall.name,
              input: toolCall.input,
              tool_use_id: toolCall.id,
            });

            const toolResult = await executeAgentTool(run_id, toolCall.name, toolCall.input, 'claude');

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
        return res.end();
      } catch (anthropicErr) {
        console.warn('[Chat SSE Anthropic Error - Failing over to Gemini / Heuristic]:', anthropicErr.message);
      }
    }

    // Tier 2: Try Gemini if key is configured (or after Claude credit failure)
    if (geminiKey) {
      try {
        await handleGeminiAgentConversation(run_id, run, messages, geminiKey, sendEvent);
        sendEvent({ type: 'done' });
        return res.end();
      } catch (geminiErr) {
        console.warn('[Chat SSE Gemini Error - Failing over to Heuristic]:', geminiErr.message);
      }
    }

    // Tier 3: Deterministic Heuristic Engine Fallback
    await handleOfflineAgentConversation(run_id, run, messages, sendEvent);
    sendEvent({ type: 'done' });
    return res.end();
  } catch (err) {
    sendEvent({ type: 'error', message: err.message || 'Error processing chat message' });
    sendEvent({ type: 'done' });
    res.end();
  }
}

/**
 * Handles Gemini agent conversation with tool calling and SSE streaming
 */
async function handleGeminiAgentConversation(runId, run, messages, geminiKey, sendEvent) {
  sendEvent({
    type: 'engine_info',
    engine: 'gemini',
    engine_name: 'Gemini Assistant',
  });

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  let contents = messages.map((m) => {
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
    const textContent = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return {
      role,
      parts: [{ text: textContent }],
    };
  });

  let turns = 0;
  while (turns < 5) {
    turns++;

    const payload = {
      system_instruction: {
        parts: [{ text: `${AGENT_SYSTEM_PROMPT}\nActive Run ID: "${runId}" (Status: ${run.status}, Total records: ${run.total_records}, Match rate: ${run.match_rate}%).` }],
      },
      contents,
      tools: [
        {
          functionDeclarations: GEMINI_AGENT_TOOLS,
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Chat API HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let hasFunctionCall = false;

    for (const part of parts) {
      if (part.text) {
        sendEvent({ type: 'text', content: part.text });
      }
      if (part.functionCall) {
        hasFunctionCall = true;
        const call = part.functionCall;
        const callId = `gemini_call_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        sendEvent({
          type: 'tool_start',
          tool_name: call.name,
          input: call.args || {},
          tool_use_id: callId,
        });

        const result = await executeAgentTool(runId, call.name, call.args || {}, 'gemini');

        sendEvent({
          type: 'tool_result',
          tool_name: call.name,
          result,
          tool_use_id: callId,
        });

        contents.push(candidate.content);

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: { name: call.name, content: result },
              },
            },
          ],
        });
      }
    }

    if (!hasFunctionCall) {
      break;
    }
  }
}

/**
 * Handles offline agent queries using real MongoDB queries via agentToolRouter and generates formatted answers
 */
async function handleOfflineAgentConversation(runId, run, messages, sendEvent) {
  sendEvent({
    type: 'engine_info',
    engine: 'heuristic',
    engine_name: 'Forensic Inspector Engine',
  });

  const lastMessage = messages[messages.length - 1]?.content || '';
  const queryLower = lastMessage.toLowerCase();

  const runStatus = run?.status || 'complete';
  const totalRecs = run?.total_records || 500;
  const pass1 = run?.pass1_matched || 0;
  const pass2 = run?.pass2_matched || 0;
  const pass3 = run?.pass3_matched || 0;
  const unresolvedRecs = run?.unresolved || 0;
  const matchRate = run?.match_rate || 0.0;

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
              `- **${e.bank_record_id || e.id || 'EXC'}** [${(e.category || 'unknown').toUpperCase()}]: ${e.ai_rationale || 'Discrepancy detected'} (${(
                (e.confidence || 0) * 100
              ).toFixed(0)}% confidence, Status: \`${e.human_decision || 'pending'}\`)`
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
        `- **Status:** \`${runStatus}\`\n` +
        `- **Total Records:** **${totalRecs}**\n` +
        `- **Pass 1 Exact Matches:** **${pass1}**\n` +
        `- **Pass 2 Fuzzy Matches:** **${pass2}**\n` +
        `- **Pass 3 Claude AI Matches:** **${pass3}**\n` +
        `- **Unresolved / Exceptions:** **${unresolvedRecs}**\n` +
        `- **Final Reconciliation Rate:** **${matchRate}%**\n\n` +
        `Sample verified matches:\n` +
        (result.matches || [])
          .slice(0, 3)
          .map(
            (m) =>
              `- **${m.bank_record_id || 'BNK'}** ↔ **${m.ledger_record_id || 'LED'}** [${(m.method || 'exact').toUpperCase()}]: ${m.rationale || 'Matched'}`
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
      content: `I am connected to the live database for **Run ${runId}** (Reconciliation Rate: **${matchRate}%**).\n\n` +
        `You can ask me to:\n` +
        `- Inspect specific bank or ledger transactions (e.g. *"Show details for BNK-xxx"*)\n` +
        `- Analyze exception categories like duplicates, refunds, or bank fees\n` +
        `- Review the latest audit trail logs and human resolutions.`,
    });
  }
}

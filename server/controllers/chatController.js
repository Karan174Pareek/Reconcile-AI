import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import { CLAUDE_AGENT_TOOLS, GEMINI_AGENT_TOOLS, executeAgentTool } from '../services/agentToolRouter.js';
import Run from '../models/Run.js';
import { MemoryStore } from '../services/memoryStore.js';
import { getSanitizedAnthropicKey, getSanitizedGeminiKey } from '../services/claudeOrchestrator.js';
import { ensureDbReady } from '../config/db.js';

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
    await ensureDbReady();

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
  await ensureDbReady();

  sendEvent({
    type: 'engine_info',
    engine: 'heuristic',
    engine_name: 'Forensic Inspector Engine',
  });

  const lastMessage = messages[messages.length - 1]?.content || '';
  const queryLower = lastMessage.toLowerCase().trim();

  // Pattern 1: Unrecorded orders / missing ledger entries
  if (
    queryLower.includes('unrecorded') ||
    queryLower.includes('missing') ||
    queryLower.includes('no ledger') ||
    queryLower.includes('without ledger')
  ) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_exceptions',
      input: { category: 'unrecorded', limit: 20 },
      tool_use_id: 'tool_call_unrecorded_1',
    });

    const result = await executeAgentTool(runId, 'query_exceptions', { category: 'unrecorded', limit: 20 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_exceptions',
      result,
      tool_use_id: 'tool_call_unrecorded_1',
    });

    const exceptions = result.exceptions || [];
    if (exceptions.length > 0) {
      const rows = exceptions
        .map(
          (e, i) =>
            `| **${e.bank_record_id || e.id || `EXC-${i + 1}`}** | ${e.payment_id || 'N/A'} | ${e.order_id || 'N/A'} | ₹${Number(e.expected_amount || e.settled_amount || 0).toLocaleString('en-IN')} | ${e.ai_rationale || 'Unrecorded bank payment missing ledger entry'} | \`${e.human_decision || 'pending'}\` |`
        )
        .join('\n');

      sendEvent({
        type: 'text',
        content: `### Unrecorded Razorpay Payments (Missing Ledger Entries)\n\n` +
          `Found **${exceptions.length} unrecorded transaction(s)** in active run **${runId}** where direct bank credits exist without corresponding internal ledger order entries:\n\n` +
          `| Bank Record ID | Payment ID | Order ID | Amount (₹) | Diagnostic Rationale | Status |\n` +
          `| :--- | :--- | :--- | :--- | :--- | :--- |\n` +
          `${rows}\n\n` +
          `*Note: Draft remediation actions (Vendor Email / Adjusting Journal Entry) have been automatically queued in the **Draft Remediation** panel for human auditor approval.*`,
      });
    } else {
      sendEvent({
        type: 'text',
        content: `### Unrecorded Orders Analysis\n\nNo unrecorded bank payments missing internal ledger entries were found in run **${runId}**. All bank credits have been correlated with settlement batches or ledger records.`,
      });
    }
    return;
  }

  // Pattern 2: GST / Input Tax Credit (ITC)
  if (
    queryLower.includes('gst') ||
    queryLower.includes('itc') ||
    queryLower.includes('tax credit') ||
    queryLower.includes('input tax')
  ) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_settlements',
      input: { limit: 50 },
      tool_use_id: 'tool_call_gst_1',
    });

    const result = await executeAgentTool(runId, 'query_settlements', { limit: 50 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_settlements',
      result,
      tool_use_id: 'tool_call_gst_1',
    });

    const settlements = result.settlements || [];
    let totalGross = 0;
    let totalMdr = 0;
    let totalGst = 0;

    const rows = settlements.map((s) => {
      const gross = Number(s.gross_amount || 0);
      const mdr = Number(s.fees || gross * 0.02);
      const gst = Number(s.tax || mdr * 0.18);
      totalGross += gross;
      totalMdr += mdr;
      totalGst += gst;
      return `| **${s.settlement_id}** | ${s.settled_at ? new Date(s.settled_at).toISOString().split('T')[0] : '2026-08'} | ₹${gross.toLocaleString('en-IN')} | ₹${mdr.toFixed(2)} | **₹${gst.toFixed(2)}** |`;
    }).join('\n');

    sendEvent({
      type: 'text',
      content: `### GST Input Tax Credit (ITC) Breakdown for Cycle \`${runId}\`\n\n` +
        `**Total Claimable GST ITC: ₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n\n` +
        `Razorpay charges an **18% GST** on payment gateway processing fees (MDR). Under Section 16 of the CGST Act, this tax component is fully eligible as Input Tax Credit:\n\n` +
        `| Settlement ID | Date | Gross Amount (₹) | MDR Fees (₹) | **GST on MDR (18%) (₹)** |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        `${rows}\n` +
        `| **Total** | — | **₹${totalGross.toLocaleString('en-IN')}** | **₹${totalMdr.toFixed(2)}** | **₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** |\n\n` +
        `**Tax note:** Eligibility for Input Tax Credit remains subject to the merchant's tax position, valid documentation, and GSTR-2B reconciliation.`,
    });
    return;
  }

  // Pattern 3: Imbalanced / Batch Imbalance
  if (
    queryLower.includes('imbalance') ||
    queryLower.includes('imbalanced') ||
    queryLower.includes('integrity') ||
    queryLower.includes('level 1')
  ) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_settlements',
      input: { integrity_status: 'imbalanced', limit: 20 },
      tool_use_id: 'tool_call_imbalance_1',
    });

    const result = await executeAgentTool(runId, 'query_settlements', { integrity_status: 'imbalanced', limit: 20 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_settlements',
      result,
      tool_use_id: 'tool_call_imbalance_1',
    });

    const imbalanced = result.settlements || [];
    if (imbalanced.length > 0) {
      const rows = imbalanced.map((s) => {
        const expectedNet = Number(s.gross_amount || 0) - Number(s.fees || 0) - Number(s.tax || 0) - Number(s.refunds || 0);
        const diff = Number(s.amount || 0) - expectedNet;
        return `| **${s.settlement_id}** | ${s.utr || 'UTR-N/A'} | ₹${Number(s.gross_amount || 0).toLocaleString('en-IN')} | ₹${Number(s.amount || 0).toLocaleString('en-IN')} | ₹${Math.abs(diff).toFixed(2)} | \`IMBALANCED\` |`;
      }).join('\n');

      sendEvent({
        type: 'text',
        content: `### Imbalanced Settlement Batches (Level 1 Integrity Flag)\n\n` +
          `Found **${imbalanced.length} imbalanced settlement batch(es)** in run **${runId}** failing Level 1 mathematical verification ($\text{Gross} - \text{Fees} - \text{GST} - \text{Refunds} \\neq \\text{Net}$):\n\n` +
          `| Settlement ID | UTR | Gross Amount (₹) | Net Settled (₹) | Discrepancy (₹) | Status |\n` +
          `| :--- | :--- | :--- | :--- | :--- | :--- |\n` +
          `${rows}\n\n` +
          `*Note: Imbalanced batches are halted at Level 1 and flagged for manual audit before line-item unpacking.*`,
      });
    } else {
      sendEvent({
        type: 'text',
        content: `### Settlement Batch Integrity Report\n\n${run?.level1_balanced ?? 0} of ${(run?.level1_balanced ?? 0) + (run?.level1_flagged ?? 0)} settlement batches passed Level 1 mathematical integrity checks. No imbalanced batches were detected in the active run.`,
      });
    }
    return;
  }

  // Pattern 4: General exceptions / MDR fee / refunds
  if (
    queryLower.includes('exception') ||
    queryLower.includes('fee') ||
    queryLower.includes('mdr') ||
    queryLower.includes('refund') ||
    queryLower.includes('unresolved') ||
    queryLower.includes('issue') ||
    queryLower.includes('variance')
  ) {
    let categoryFilter = null;
    if (queryLower.includes('mdr') || queryLower.includes('fee')) categoryFilter = 'mdr_fee';
    else if (queryLower.includes('refund')) categoryFilter = 'refund_deduction';

    sendEvent({
      type: 'tool_start',
      tool_name: 'query_exceptions',
      input: { ...(categoryFilter ? { category: categoryFilter } : {}), limit: 15 },
      tool_use_id: 'tool_call_exc_1',
    });

    const result = await executeAgentTool(runId, 'query_exceptions', { ...(categoryFilter ? { category: categoryFilter } : {}), limit: 15 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_exceptions',
      result,
      tool_use_id: 'tool_call_exc_1',
    });

    const exceptions = result.exceptions || [];
    const rows = exceptions.slice(0, 10).map((e) => {
      return `| **${e.bank_record_id || e.id}** | ${e.settlement_id || 'N/A'} | \`${(e.category || 'unknown').toUpperCase()}\` | ₹${Number(e.variance_amount || 0).toFixed(2)} | ${e.ai_rationale || 'Variance detected'} | \`${e.human_decision || 'pending'}\` |`;
    }).join('\n');

    sendEvent({
      type: 'text',
      content: `### Reconciliation Exceptions Report for Run \`${runId}\`\n\n` +
        `Retrieved **${exceptions.length} exception(s)** from the diagnostic queue${categoryFilter ? ` matching category \`${categoryFilter}\`` : ''}:\n\n` +
        `| Record / ID | Settlement ID | Category | Variance (₹) | Diagnostic Rationale | Status |\n` +
        `| :--- | :--- | :--- | :--- | :--- | :--- |\n` +
        `${rows}\n\n` +
        `Review individual exception details in the **Exception Queue** tab.`,
    });
    return;
  }

  // Pattern 5: Matches / Reconciliation Summary
  if (
    queryLower.includes('match') ||
    queryLower.includes('rate') ||
    queryLower.includes('summary') ||
    queryLower.includes('overview') ||
    queryLower.includes('status')
  ) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_matches',
      input: { limit: 10 },
      tool_use_id: 'tool_call_matches_1',
    });

    const result = await executeAgentTool(runId, 'query_matches', { limit: 10 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_matches',
      result,
      tool_use_id: 'tool_call_matches_1',
    });

    const runStatus = run?.status || 'unknown';
    const totalRecs = Number.isFinite(Number(run?.total_records)) ? Number(run.total_records) : 0;
    const pass1 = Number.isFinite(Number(run?.pass1_matched)) ? Number(run.pass1_matched) : 0;
    const pass2 = Number.isFinite(Number(run?.pass2_matched)) ? Number(run.pass2_matched) : 0;
    const pass3 = Number.isFinite(Number(run?.pass3_matched)) ? Number(run.pass3_matched) : 0;
    const unresolvedRecs = Number.isFinite(Number(run?.unresolved)) ? Number(run.unresolved) : 0;
    const matchRate = Number.isFinite(Number(run?.match_rate)) ? Number(run.match_rate) : 0;
    const level0Matched = Number.isFinite(Number(run?.level0_matched)) ? Number(run.level0_matched) : 0;
    const level1Balanced = Number.isFinite(Number(run?.level1_balanced)) ? Number(run.level1_balanced) : 0;
    const level1Flagged = Number.isFinite(Number(run?.level1_flagged)) ? Number(run.level1_flagged) : 0;

    const matchRows = (result.matches || []).slice(0, 5).map((m) => {
      return `- **${m.bank_record_id || 'BNK'}** ↔ **${m.ledger_record_id || 'LED'}** [Level ${m.level || 2} - ${(m.method || 'exact').toUpperCase()}]: ${m.rationale || 'Matched'}`;
    }).join('\n');

    sendEvent({
      type: 'text',
      content: `### Reconciliation Overview for Run \`${runId}\`\n\n` +
        `- **Status:** \`${runStatus}\`\n` +
        `- **Total Records Analyzed:** **${totalRecs}**\n` +
        `- **Level 0 (Bank-Settlement):** **${level0Matched}** matched\n` +
        `- **Level 1 (Batch Integrity):** **${level1Balanced}** balanced, **${level1Flagged}** imbalanced\n` +
        `- **Level 2 (Order Unpacking):** **${pass1}** exact, **${pass2}** fuzzy, **${pass3}** AI matched\n` +
        `- **Unresolved Exceptions:** **${unresolvedRecs}**\n` +
        `- **Overall Match Rate:** **${matchRate}%**\n\n` +
        `**Sample Matched Records:**\n${matchRows}`,
    });
    return;
  }

  // Pattern 6: Audit log / activity history
  if (
    queryLower.includes('audit') ||
    queryLower.includes('log') ||
    queryLower.includes('history') ||
    queryLower.includes('trail') ||
    queryLower.includes('activity')
  ) {
    sendEvent({
      type: 'tool_start',
      tool_name: 'query_audit_log',
      input: { limit: 10 },
      tool_use_id: 'tool_call_audit_1',
    });

    const result = await executeAgentTool(runId, 'query_audit_log', { limit: 10 }, 'heuristic');

    sendEvent({
      type: 'tool_result',
      tool_name: 'query_audit_log',
      result,
      tool_use_id: 'tool_call_audit_1',
    });

    const logs = result.logs || [];
    const rows = logs.map((l) => {
      const ts = l.timestamp ? new Date(l.timestamp).toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
      return `| ${ts} | \`${l.actor || 'system'}\` | \`${l.action}\` | \`${l.target_type || 'N/A'}\` | ${l.target_id || 'N/A'} |`;
    }).join('\n');

    sendEvent({
      type: 'text',
      content: `### Audit Trail Log Timeline for Run \`${runId}\`\n\n` +
        `Retrieved **${logs.length} audit trail event(s)**:\n\n` +
        `| Timestamp | Actor | Action | Target Type | Target ID |\n` +
        `| :--- | :--- | :--- | :--- | :--- |\n` +
        `${rows}`,
    });
    return;
  }

  // Fallback: Default unmatched prompt
  sendEvent({
    type: 'tool_start',
    tool_name: 'query_audit_log',
    input: { limit: 5 },
    tool_use_id: 'tool_call_default_1',
  });

  const result = await executeAgentTool(runId, 'query_audit_log', { limit: 5 }, 'heuristic');

  sendEvent({
    type: 'tool_result',
    tool_name: 'query_audit_log',
    result,
    tool_use_id: 'tool_call_default_1',
  });

  const matchRate = Number.isFinite(Number(run?.match_rate)) ? Number(run.match_rate) : 0;
  sendEvent({
    type: 'text',
    content: `I am operating in **Forensic Inspector Engine Mode** for run **\`${runId}\`** (Overall Match Rate: **${matchRate}%**).\n\n` +
      `You can ask specific data queries such as:\n` +
      `- *"List all unrecorded Razorpay orders settled without ledger entries"* (Queries \`query_exceptions\` for unrecorded orders)\n` +
      `- *"What GST on MDR was identified this cycle and why?"* (Calculates the 18% tax component on MDR fees)\n` +
      `- *"Show imbalanced settlement batches"* (Queries \`query_settlements\` for Level 1 batch imbalance flags)\n` +
      `- *"Show audit trail log timeline"* (Queries append-only \`query_audit_log\` events)`,
  });
}

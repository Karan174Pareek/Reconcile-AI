import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Anthropic Claude tool calling definitions for read-only reconciliation queries
 */
export const CLAUDE_AGENT_TOOLS = [
  {
    name: 'query_matches',
    description:
      'Search and list matched records for this reconciliation run. Useful for answering questions about successful exact, fuzzy, or AI matches.',
    input_schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['exact', 'fuzzy', 'ai'],
          description: 'Filter matches by method (exact, fuzzy, or ai)',
        },
        min_confidence: {
          type: 'number',
          description: 'Minimum match confidence threshold (0.0 to 1.0)',
        },
        limit: {
          type: 'integer',
          description: 'Max records to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'query_exceptions',
    description:
      'Search and inspect unresolved or categorized exception records for this reconciliation run.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['duplicate', 'refund', 'bank_fee', 'timing_lag', 'unrecorded', 'unknown'],
          description: 'Filter by diagnosed exception category',
        },
        human_decision: {
          type: 'string',
          enum: ['pending', 'accepted', 'rejected', 'manually_resolved'],
          description: 'Filter by human review decision status',
        },
        limit: {
          type: 'integer',
          description: 'Max records to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'query_audit_log',
    description:
      'Inspect the append-only audit trail of system events, human actions, and AI operations for this run.',
    input_schema: {
      type: 'object',
      properties: {
        target_type: {
          type: 'string',
          enum: ['match', 'exception', 'draft_action', 'agent_query'],
          description: 'Filter audit logs by target type',
        },
        limit: {
          type: 'integer',
          description: 'Max records to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'get_record_by_id',
    description:
      'Lookup a specific single record by its ID across bank_records, ledger_records, matches, exceptions, or draft_actions collections.',
    input_schema: {
      type: 'object',
      required: ['collection', 'id'],
      properties: {
        collection: {
          type: 'string',
          enum: ['bank_records', 'ledger_records', 'matches', 'exceptions', 'draft_actions'],
          description: 'The target collection name',
        },
        id: {
          type: 'string',
          description: 'The unique ID or reference of the record',
        },
      },
    },
  },
];

/**
 * Executes a read-only tool query securely scoped to the provided run_id.
 * Mutating queries are strictly rejected.
 * Logs every invocation directly into AuditLog.
 *
 * @param {string} runId
 * @param {string} toolName
 * @param {object} toolInput
 * @returns {Promise<object>}
 */
export async function executeAgentTool(runId, toolName, toolInput = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(toolInput.limit, 10) || 20));

  let resultData = null;

  try {
    switch (toolName) {
      case 'query_matches': {
        const query = { run_id: runId };
        if (toolInput.method) query.method = toolInput.method;
        if (typeof toolInput.min_confidence === 'number') {
          query.confidence = { $gte: toolInput.min_confidence };
        }

        const matches = await Match.find(query).limit(limit).lean();
        resultData = {
          count: matches.length,
          matches: matches.map((m) => ({
            bank_record_id: m.bank_record_id,
            ledger_record_id: m.ledger_record_id,
            method: m.method,
            confidence: m.confidence,
            rationale: m.rationale,
          })),
        };
        break;
      }

      case 'query_exceptions': {
        const query = { run_id: runId };
        if (toolInput.category) query.category = toolInput.category;
        if (toolInput.human_decision) query.human_decision = toolInput.human_decision;

        const exceptions = await Exception.find(query).limit(limit).lean();
        resultData = {
          count: exceptions.length,
          exceptions: exceptions.map((e) => ({
            id: e.id,
            bank_record_id: e.bank_record_id,
            category: e.category,
            confidence: e.confidence,
            ai_rationale: e.ai_rationale,
            human_decision: e.human_decision,
            candidate_ledger_ids: e.candidate_ledger_ids,
          })),
        };
        break;
      }

      case 'query_audit_log': {
        const query = { run_id: runId };
        if (toolInput.target_type) query.target_type = toolInput.target_type;

        const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(limit).lean();
        resultData = {
          count: logs.length,
          logs: logs.map((l) => ({
            actor: l.actor,
            action: l.action,
            target_type: l.target_type,
            target_id: l.target_id,
            timestamp: l.timestamp,
            details: l.details,
          })),
        };
        break;
      }

      case 'get_record_by_id': {
        const { collection, id } = toolInput;
        if (!collection || !id) {
          resultData = { error: 'Missing collection or id parameter' };
          break;
        }

        let doc = null;
        if (collection === 'bank_records') {
          doc = await BankRecord.findOne({ run_id: runId, $or: [{ id }, { utr_ref: id }] }).lean();
        } else if (collection === 'ledger_records') {
          doc = await LedgerRecord.findOne({ run_id: runId, $or: [{ id }, { invoice_ref: id }] }).lean();
        } else if (collection === 'matches') {
          doc = await Match.findOne({ run_id: runId, $or: [{ bank_record_id: id }, { ledger_record_id: id }] }).lean();
        } else if (collection === 'exceptions') {
          doc = await Exception.findOne({ run_id: runId, $or: [{ id }, { bank_record_id: id }] }).lean();
        } else if (collection === 'draft_actions') {
          doc = await DraftAction.findOne({ run_id: runId, $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { exception_id: id }] }).lean();
        } else {
          resultData = { error: `Unsupported collection "${collection}"` };
          break;
        }

        resultData = doc ? { found: true, record: doc } : { found: false, message: `Record "${id}" not found in ${collection}` };
        break;
      }

      default:
        resultData = { error: `Unknown tool "${toolName}"` };
    }

    // Append-only audit logging of tool invocation
    await AuditLog.create({
      run_id: runId,
      actor: 'claude',
      action: 'agent_query',
      target_type: 'agent_query',
      target_id: toolName,
      details: {
        tool_name: toolName,
        tool_input: toolInput,
        result_count: resultData?.count || (resultData?.found ? 1 : 0),
      },
    });

    return resultData;
  } catch (err) {
    console.error(`[Agent Tool Error] ${toolName}:`, err);
    return { error: err.message };
  }
}

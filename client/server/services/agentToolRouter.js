import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import SettlementReport from '../models/SettlementReport.js';
import SettlementLineItem from '../models/SettlementLineItem.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import { MemoryStore } from './memoryStore.js';
import { ensureDbReady } from '../config/db.js';

/**
 * Anthropic Claude tool calling definitions for read-only reconciliation queries
 */
export const CLAUDE_AGENT_TOOLS = [
  {
    name: 'query_settlements',
    description:
      'List and inspect Razorpay settlement batches for this run, including gross amounts, MDR fees, 18% GST tax, and integrity status.',
    input_schema: {
      type: 'object',
      properties: {
        integrity_status: {
          type: 'string',
          enum: ['balanced', 'imbalanced', 'pending'],
          description: 'Filter by integrity check status',
        },
        limit: {
          type: 'integer',
          description: 'Max records to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'get_settlement_detail',
    description:
      'Lookup complete unpacked reconciliation worksheet for a specific Razorpay settlement_id, including its bank credit and all constituent order line items.',
    input_schema: {
      type: 'object',
      required: ['settlement_id'],
      properties: {
        settlement_id: {
          type: 'string',
          description: 'The unique Razorpay settlement ID (e.g. setl_001)',
        },
      },
    },
  },
  {
    name: 'query_matches',
    description:
      'Search and list matched records across Level 0 (Bank-Settlement), Level 1 (Batch Integrity), or Level 2 (Order Unpacking).',
    input_schema: {
      type: 'object',
      properties: {
        level: {
          type: 'integer',
          enum: [0, 1, 2],
          description: 'Reconciliation hierarchy level (0: Bank<->Settlement, 1: Integrity, 2: Order Unpacking)',
        },
        method: {
          type: 'string',
          enum: ['exact', 'fuzzy', 'ai', 'batch_integrity'],
          description: 'Filter matches by method',
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
      'Search and filter unmatched reconciliation exceptions (MDR fee variances, 18% GST, refunds, partial settlements, unrecorded orders).',
    input_schema: {
      type: 'object',
      properties: {
        settlement_id: {
          type: 'string',
          description: 'Filter exceptions by Razorpay settlement ID',
        },
        category: {
          type: 'string',
          enum: [
            'mdr_fee',
            'gst_on_mdr',
            'refund_deduction',
            'rounding',
            'partial_settlement',
            'unrecorded',
            'unknown',
            'duplicate',
            'timing_lag',
            'bank_fee',
          ],
          description: 'Filter by financial variance category',
        },
        human_decision: {
          type: 'string',
          enum: ['pending', 'accepted', 'rejected', 'escalated'],
          description: 'Filter by human auditor decision status',
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
      'Retrieve append-only audit trail logs for this run, including matching decisions, AI reasoning, and human resolution actions.',
    input_schema: {
      type: 'object',
      properties: {
        target_type: {
          type: 'string',
          enum: ['run', 'match', 'exception', 'draft_action', 'agent_query'],
          description: 'Filter audit logs by target entity type',
        },
        limit: {
          type: 'integer',
          description: 'Max log records to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'get_record_by_id',
    description:
      'Lookup a specific single record by its ID across bank_records, ledger_records, settlement_reports, settlement_line_items, matches, exceptions, or draft_actions collections.',
    input_schema: {
      type: 'object',
      required: ['collection', 'id'],
      properties: {
        collection: {
          type: 'string',
          enum: [
            'bank_records',
            'ledger_records',
            'settlement_reports',
            'settlement_line_items',
            'matches',
            'exceptions',
            'draft_actions',
          ],
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

function convertSchemaForGemini(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(convertSchemaForGemini);

  const copy = { ...schema };
  if (Array.isArray(copy.enum)) {
    copy.enum = copy.enum.map(String);
  }
  if (copy.properties) {
    const newProps = {};
    for (const [key, val] of Object.entries(copy.properties)) {
      newProps[key] = convertSchemaForGemini(val);
    }
    copy.properties = newProps;
  }
  return copy;
}

/**
 * Google Gemini tool calling definitions (mapped from CLAUDE_AGENT_TOOLS parameters)
 */
export const GEMINI_AGENT_TOOLS = CLAUDE_AGENT_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: convertSchemaForGemini(t.input_schema),
}));

/**
 * Dispatches a tool call from Claude Conversational Agent securely (read-only execution)
 */
export async function executeAgentTool(runId, toolName, inputArgs = {}, actor = 'claude') {
  await ensureDbReady();
  await MemoryStore.ensureRunHydrated(runId);

  const limit = Math.min(Math.max(1, Number(inputArgs.limit) || 20), 50);
  let result = null;

  switch (toolName) {
    case 'query_settlements': {
      let settlements = [];
      if (mongoose.connection.readyState === 1) {
        try {
          const query = { run_id: runId };
          if (inputArgs.integrity_status) query.integrity_status = inputArgs.integrity_status;

          settlements = await SettlementReport.find(query)
            .limit(limit)
            .sort({ settled_at: -1 })
            .lean();
        } catch (e) {
          console.warn('[Mongo query_settlements Warning]:', e.message);
        }
      }

      if (settlements.length === 0) {
        settlements = MemoryStore.getSettlementReports(runId);
        if (inputArgs.integrity_status) {
          settlements = settlements.filter((s) => s.integrity_status === inputArgs.integrity_status);
        }
        settlements = settlements.slice(0, limit);
      }

      result = {
        count: settlements.length,
        settlements: settlements.map((s) => ({
          settlement_id: s.settlement_id,
          amount: s.amount,
          gross_amount: s.gross_amount,
          fees: s.fees,
          tax: s.tax,
          refunds: s.refunds,
          utr: s.utr,
          status: s.status,
          integrity_status: s.integrity_status,
          settled_at: s.settled_at,
          item_count: s.item_count,
        })),
      };
      break;
    }

    case 'get_settlement_detail': {
      const { settlement_id } = inputArgs;
      if (!settlement_id) {
        result = { error: 'settlement_id is required' };
        break;
      }

      let settlement = null;
      let lineItems = [];
      let bankRecord = null;

      if (mongoose.connection.readyState === 1) {
        try {
          settlement = await SettlementReport.findOne({ run_id: runId, settlement_id }).lean();
          if (settlement) {
            lineItems = await SettlementLineItem.find({ run_id: runId, settlement_id })
              .limit(100)
              .lean();

            if (settlement.bank_record_id) {
              bankRecord = await BankRecord.findOne({ run_id: runId, id: settlement.bank_record_id }).lean();
            }
          }
        } catch (e) {
          console.warn('[Mongo get_settlement_detail Warning]:', e.message);
        }
      }

      if (!settlement) {
        const reports = MemoryStore.getSettlementReports(runId);
        settlement = reports.find((s) => s.settlement_id === settlement_id) || null;
        if (settlement) {
          const allLines = MemoryStore.getSettlementLineItems(runId);
          lineItems = allLines.filter((li) => li.settlement_id === settlement_id).slice(0, 100);
          const allBank = MemoryStore.getBankRecords(runId);
          bankRecord = allBank.find((b) => b.id === settlement.bank_record_id) || null;
        }
      }

      if (!settlement) {
        result = { error: `Settlement "${settlement_id}" not found` };
        break;
      }

      result = {
        settlement,
        bankRecord,
        line_items_count: lineItems.length,
        line_items: lineItems.map((li) => ({
          payment_id: li.payment_id,
          order_id: li.order_id,
          type: li.type,
          amount: li.amount,
          fee: li.fee,
          tax: li.tax,
          net_amount: li.net_amount,
          unpacked_status: li.unpacked_status,
          variance_category: li.variance_category,
        })),
      };
      break;
    }

    case 'query_matches': {
      let matches = [];
      if (mongoose.connection.readyState === 1) {
        try {
          const query = { run_id: runId };
          if (inputArgs.level !== undefined) query.level = inputArgs.level;
          if (inputArgs.method) query.method = inputArgs.method;
          if (inputArgs.min_confidence !== undefined) {
            query.confidence = { $gte: Number(inputArgs.min_confidence) };
          }
          matches = await Match.find(query).limit(limit).sort({ created_at: -1 }).lean();
        } catch (e) {
          console.warn('[Mongo query_matches Warning]:', e.message);
        }
      }

      if (matches.length === 0) {
        matches = MemoryStore.getMatches(runId);
        if (inputArgs.level !== undefined) matches = matches.filter((m) => m.level === inputArgs.level);
        if (inputArgs.method) matches = matches.filter((m) => m.method === inputArgs.method);
        if (inputArgs.min_confidence !== undefined) matches = matches.filter((m) => m.confidence >= Number(inputArgs.min_confidence));
        matches = matches.slice(0, limit);
      }

      result = {
        count: matches.length,
        matches: matches.map((m) => ({
          level: m.level,
          bank_record_id: m.bank_record_id,
          settlement_id: m.settlement_id,
          payment_id: m.payment_id,
          order_id: m.order_id,
          ledger_record_id: m.ledger_record_id,
          method: m.method,
          confidence: m.confidence,
          rationale: m.rationale,
          variance_category: m.variance_category,
        })),
      };
      break;
    }

    case 'query_exceptions': {
      let exceptions = [];
      if (mongoose.connection.readyState === 1) {
        try {
          const query = { run_id: runId };
          if (inputArgs.settlement_id) query.settlement_id = inputArgs.settlement_id;
          if (inputArgs.category) query.category = inputArgs.category;
          if (inputArgs.human_decision) query.human_decision = inputArgs.human_decision;

          exceptions = await Exception.find(query).limit(limit).sort({ created_at: -1 }).lean();
        } catch (e) {
          console.warn('[Mongo query_exceptions Warning]:', e.message);
        }
      }

      if (exceptions.length === 0) {
        exceptions = MemoryStore.getExceptions(runId);
        if (inputArgs.settlement_id) exceptions = exceptions.filter((e) => e.settlement_id === inputArgs.settlement_id);
        if (inputArgs.category) exceptions = exceptions.filter((e) => e.category === inputArgs.category);
        if (inputArgs.human_decision) exceptions = exceptions.filter((e) => e.human_decision === inputArgs.human_decision);
        exceptions = exceptions.slice(0, limit);
      }

      result = {
        count: exceptions.length,
        exceptions: exceptions.map((e) => ({
          id: e._id?.toString() || e.id,
          settlement_id: e.settlement_id,
          payment_id: e.payment_id,
          order_id: e.order_id,
          bank_record_id: e.bank_record_id,
          category: e.category,
          expected_amount: e.expected_amount,
          settled_amount: e.settled_amount,
          variance_amount: e.variance_amount,
          variance_breakdown: e.variance_breakdown,
          ai_rationale: e.ai_rationale,
          confidence: e.confidence,
          human_decision: e.human_decision,
        })),
      };
      break;
    }

    case 'query_audit_log': {
      let logs = [];
      if (mongoose.connection.readyState === 1) {
        try {
          const query = { run_id: runId };
          if (inputArgs.target_type) query.target_type = inputArgs.target_type;

          logs = await AuditLog.find(query).limit(limit).sort({ timestamp: -1 }).lean();
        } catch (e) {
          console.warn('[Mongo query_audit_log Warning]:', e.message);
        }
      }

      if (logs.length === 0) {
        logs = MemoryStore.getAuditLogs(runId);
        if (inputArgs.target_type) logs = logs.filter((l) => l.target_type === inputArgs.target_type);
        logs = logs.slice(0, limit);
      }

      result = {
        count: logs.length,
        logs: logs.map((l) => ({
          id: l._id?.toString() || l.id,
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
      const { collection, id } = inputArgs;
      if (!collection || !id) {
        result = { error: 'collection and id are required' };
        break;
      }

      let doc = null;
      if (mongoose.connection.readyState === 1) {
        try {
          switch (collection) {
            case 'bank_records':
              doc = await BankRecord.findOne({ run_id: runId, id }).lean();
              break;
            case 'ledger_records':
              doc = await LedgerRecord.findOne({ run_id: runId, $or: [{ id }, { order_id: id }] }).lean();
              break;
            case 'settlement_reports':
              doc = await SettlementReport.findOne({ run_id: runId, settlement_id: id }).lean();
              break;
            case 'settlement_line_items':
              doc = await SettlementLineItem.findOne({ run_id: runId, $or: [{ payment_id: id }, { id }] }).lean();
              break;
            case 'matches':
              doc = await Match.findOne({
                run_id: runId,
                $or: [{ bank_record_id: id }, { settlement_id: id }, { payment_id: id }, { order_id: id }],
              }).lean();
              break;
            case 'exceptions':
              doc = await Exception.findOne({
                run_id: runId,
                $or: [{ bank_record_id: id }, { settlement_id: id }, { payment_id: id }, { order_id: id }],
              }).lean();
              break;
            case 'draft_actions':
              doc = await DraftAction.findOne({
                run_id: runId,
                $or: [{ exception_id: id }],
              }).lean();
              break;
            default:
              return { error: `Invalid collection: ${collection}` };
          }
        } catch (e) {
          console.warn('[Mongo get_record_by_id Warning]:', e.message);
        }
      }

      if (!doc) {
        await MemoryStore.ensureRunHydrated(runId);
        const memoryRecords = {
          bank_records: MemoryStore.getBankRecords(runId),
          ledger_records: MemoryStore.getLedgerRecords(runId),
          settlement_reports: MemoryStore.getSettlementReports(runId),
          settlement_line_items: MemoryStore.getSettlementLineItems(runId),
          matches: MemoryStore.getMatches(runId),
          exceptions: MemoryStore.getExceptions(runId),
          draft_actions: MemoryStore.getDraftActions(runId),
        }[collection] || [];
        doc = memoryRecords.find((record) => {
          const ids = [record.id, record._id?.toString(), record.bank_record_id, record.settlement_id, record.payment_id, record.order_id, record.exception_id];
          return ids.some((candidate) => candidate != null && String(candidate) === String(id));
        }) || null;
      }
      if (!doc) {
        result = { message: `No record found in "${collection}" matching ID "${id}"` };
      } else {
        result = { collection, record: doc };
      }
      break;
    }

    default:
      result = { error: `Unknown tool: ${toolName}` };
      break;
  }

  // Audit Logging for Agent Tool Execution
  const auditEntry = {
    id: `audit_tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    run_id: runId,
    actor: actor || 'agent',
    action: `agent_tool_call:${toolName}`,
    target_type: 'agent_query',
    target_id: inputArgs.id || inputArgs.settlement_id || null,
    timestamp: new Date().toISOString(),
    details: {
      tool: toolName,
      arguments: inputArgs,
    },
  };

  if (mongoose.connection.readyState === 1) {
    try {
      await AuditLog.create(auditEntry);
    } catch (auditErr) {
      console.warn('[AuditLog] Agent tool logging note:', auditErr.message);
    }
  }

  const existingLogs = MemoryStore.getAuditLogs(runId);
  existingLogs.unshift(auditEntry);
  MemoryStore.saveAuditLogs(runId, existingLogs);

  return result;
}

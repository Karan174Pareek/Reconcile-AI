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
          description: 'The unique settlement ID (e.g. setl_xxx)',
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
      'Search and inspect diagnosed settlement exceptions and variances (MDR fee, GST ITC deductions, refunds, batch imbalances, unrecorded orders).',
    input_schema: {
      type: 'object',
      properties: {
        settlement_id: {
          type: 'string',
          description: 'Filter exceptions belonging to a specific settlement batch',
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
            'batch_imbalance',
            'duplicate',
            'timing_lag',
            'unknown',
          ],
          description: 'Filter by diagnosed variance category',
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
          enum: ['match', 'exception', 'draft_action', 'agent_query', 'settlement'],
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

/**
 * Dispatches a tool call from Claude Conversational Agent securely (read-only execution)
 */
export async function executeAgentTool(runId, toolName, inputArgs = {}) {
  const limit = Math.min(Math.max(1, Number(inputArgs.limit) || 20), 50);
  let result = null;

  switch (toolName) {
    case 'query_settlements': {
      const query = { run_id: runId };
      if (inputArgs.integrity_status) query.integrity_status = inputArgs.integrity_status;

      const settlements = await SettlementReport.find(query)
        .limit(limit)
        .sort({ settled_at: -1 })
        .lean();

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

      const settlement = await SettlementReport.findOne({ run_id: runId, settlement_id }).lean();
      if (!settlement) {
        result = { error: `Settlement "${settlement_id}" not found` };
        break;
      }

      const lineItems = await SettlementLineItem.find({ run_id: runId, settlement_id })
        .limit(100)
        .lean();

      const bankRecord = settlement.bank_record_id
        ? await BankRecord.findOne({ run_id: runId, id: settlement.bank_record_id }).lean()
        : null;

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
      const query = { run_id: runId };
      if (inputArgs.level !== undefined) query.level = inputArgs.level;
      if (inputArgs.method) query.method = inputArgs.method;
      if (inputArgs.min_confidence !== undefined) {
        query.confidence = { $gte: Number(inputArgs.min_confidence) };
      }

      const matches = await Match.find(query).limit(limit).sort({ created_at: -1 }).lean();
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
      const query = { run_id: runId };
      if (inputArgs.settlement_id) query.settlement_id = inputArgs.settlement_id;
      if (inputArgs.category) query.category = inputArgs.category;
      if (inputArgs.human_decision) query.human_decision = inputArgs.human_decision;

      const exceptions = await Exception.find(query).limit(limit).sort({ created_at: -1 }).lean();
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
      const query = { run_id: runId };
      if (inputArgs.target_type) query.target_type = inputArgs.target_type;

      const logs = await AuditLog.find(query).limit(limit).sort({ timestamp: -1 }).lean();
      result = {
        count: logs.length,
        logs: logs.map((l) => ({
          id: l._id?.toString(),
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
        return { error: 'Both collection and id are required' };
      }

      let doc = null;
      switch (collection) {
        case 'settlement_reports':
          doc = await SettlementReport.findOne({
            run_id: runId,
            $or: [{ settlement_id: id }, { utr: id }],
          }).lean();
          break;
        case 'settlement_line_items':
          doc = await SettlementLineItem.findOne({
            run_id: runId,
            $or: [{ payment_id: id }, { order_id: id }],
          }).lean();
          break;
        case 'bank_records':
          doc = await BankRecord.findOne({
            run_id: runId,
            $or: [{ id }, { utr_ref: id }],
          }).lean();
          break;
        case 'ledger_records':
          doc = await LedgerRecord.findOne({
            run_id: runId,
            $or: [{ id }, { order_id: id }, { invoice_ref: id }],
          }).lean();
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
  try {
    await AuditLog.create({
      run_id: runId,
      actor: 'claude',
      action: `agent_tool_call:${toolName}`,
      target_type: 'agent_query',
      target_id: inputArgs.id || inputArgs.settlement_id || null,
      details: {
        tool: toolName,
        arguments: inputArgs,
      },
    });
  } catch (auditErr) {
    console.warn('[AuditLog] Agent tool logging note:', auditErr.message);
  }

  return result;
}


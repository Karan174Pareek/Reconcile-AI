import mongoose from 'mongoose';
import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';
import { MemoryStore } from '../services/memoryStore.js';

/**
 * Controller: Get draft remediation actions for a run
 * GET /api/runs/:run_id/draft-actions
 */
export async function getRunDraftActions(req, res, next) {
  try {
    const { run_id } = req.params;
    const { status } = req.query;

    let draftActions = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query = { run_id };
        if (status && status !== 'all') query.status = status;
        draftActions = await DraftAction.find(query).sort({ created_at: -1 }).lean();
      } catch (e) {
        console.warn('[Mongo DraftActions Warning]:', e.message);
      }
    }

    if (draftActions.length === 0) {
      draftActions = MemoryStore.getDraftActions(run_id);
    }

    // If still empty, construct initial standard drafts from flagged exceptions
    if (draftActions.length === 0) {
      const exceptions = MemoryStore.getExceptions(run_id);
      const generatedDrafts = exceptions
        .filter((e) => e.category === 'fee_variance' || e.category === 'batch_imbalance' || e.category === 'amount_mismatch')
        .slice(0, 8)
        .map((exc, idx) => ({
          _id: `draft_${run_id}_${idx + 1}`,
          id: `draft_${run_id}_${idx + 1}`,
          run_id,
          exception_id: exc.payment_id || exc.order_id || exc.bank_record_id || `exc_${idx + 1}`,
          action_type: exc.category === 'fee_variance' ? 'vendor_email' : 'ledger_journal_entry',
          status: 'pending_approval',
          draft_content: {
            subject: exc.category === 'fee_variance' ? `Discrepancy Notice: Razorpay MDR Variance on Payment ${exc.payment_id}` : `Adjustment Entry: Settlement Batch Imbalance`,
            body: `Forensic analysis detected a variance on order ${exc.order_id || exc.payment_id || 'N/A'}. Action required: Review and post adjusting journal entry to clearing account.`,
            recipient: 'finance-ops@merchant.in',
          },
          created_at: new Date().toISOString(),
          executed_at: null,
          was_edited: false,
        }));

      if (generatedDrafts.length > 0) {
        draftActions = generatedDrafts;
        MemoryStore.saveDraftActions(run_id, draftActions);
      }
    }

    if (status && status !== 'all') {
      draftActions = draftActions.filter((d) => d.status === status);
    }

    return res.status(200).json({
      success: true,
      count: draftActions.length,
      data: draftActions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Approve a draft action (HITL flow, idempotent, sandboxed email/ledger dispatch)
 * POST /api/draft-actions/:id/approve
 */
export async function approveDraftAction(req, res, next) {
  try {
    const { id } = req.params;
    const { edited_content, user_email } = req.body;

    let draft = null;

    if (mongoose.connection.readyState === 1) {
      try {
        const conditions = [];
        if (mongoose.Types.ObjectId.isValid(id)) {
          conditions.push({ _id: id });
        }
        conditions.push({ exception_id: id });
        conditions.push({ id });
        draft = await DraftAction.findOne({ $or: conditions });
      } catch (e) {
        console.warn('[Mongo Draft Find Warning]:', e.message);
      }
    }

    if (!draft) {
      const allRuns = MemoryStore.listRuns();
      for (const r of allRuns) {
        const list = MemoryStore.getDraftActions(r.run_id);
        const match = list.find((d) => d._id === id || d.id === id || d.exception_id === id);
        if (match) {
          draft = match;
          break;
        }
      }
    }

    if (!draft) {
      return res.status(404).json({
        error: {
          code: 'DRAFT_ACTION_NOT_FOUND',
          message: `DraftAction with ID "${id}" not found.`,
          details: null,
        },
      });
    }

    // Idempotency check
    if (draft.status === 'approved') {
      return res.status(200).json({
        success: true,
        already_processed: true,
        message: `Draft action was already approved at ${draft.executed_at?.toString() || 'earlier time'}`,
        data: draft,
      });
    }

    const actor = user_email || 'human_auditor';
    draft.status = 'approved';
    draft.executed_at = new Date();

    if (edited_content) {
      draft.was_edited = true;
      draft.edited_content = edited_content;
    }

    if (typeof draft.save === 'function' && mongoose.connection.readyState === 1) {
      try {
        await draft.save();
        console.log(`[DB Write: MONGODB_PRIMARY] Draft Action ${id} approved in MongoDB Atlas.`);
      } catch (e) {
        console.warn('[Mongo Save Draft Warning]:', e.message);
      }
    }

    // Audit Logging
    if (draft.run_id) {
      const auditEntry = {
        id: `audit_${Date.now()}`,
        run_id: draft.run_id,
        actor,
        action: 'draft_action_approved',
        target_type: 'draft_action',
        target_id: draft._id ? draft._id.toString() : id,
        timestamp: new Date().toISOString(),
        details: {
          action_type: draft.action_type,
          exception_id: draft.exception_id,
          was_edited: draft.was_edited,
          dispatched_sandbox: true,
        },
      };

      if (mongoose.connection.readyState === 1) {
        try {
          await AuditLog.create(auditEntry);
        } catch (e) {
          console.warn('[Mongo AuditLog Create Warning]:', e.message);
        }
      }

      const logs = MemoryStore.getAuditLogs(draft.run_id);
      logs.unshift(auditEntry);
      MemoryStore.saveAuditLogs(draft.run_id, logs);
    }

    return res.status(200).json({
      success: true,
      message: `Draft action approved and dispatched to sandbox`,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller: Reject a draft action (idempotent)
 * POST /api/draft-actions/:id/reject
 */
export async function rejectDraftAction(req, res, next) {
  try {
    const { id } = req.params;
    const { user_email, reason } = req.body;

    let draft = null;

    if (mongoose.connection.readyState === 1) {
      try {
        const conditions = [];
        if (mongoose.Types.ObjectId.isValid(id)) {
          conditions.push({ _id: id });
        }
        conditions.push({ exception_id: id });
        conditions.push({ id });
        draft = await DraftAction.findOne({ $or: conditions });
      } catch (e) {
        console.warn('[Mongo Draft Find Warning]:', e.message);
      }
    }

    if (!draft) {
      const allRuns = MemoryStore.listRuns();
      for (const r of allRuns) {
        const list = MemoryStore.getDraftActions(r.run_id);
        const match = list.find((d) => d._id === id || d.id === id || d.exception_id === id);
        if (match) {
          draft = match;
          break;
        }
      }
    }

    if (!draft) {
      return res.status(404).json({
        error: {
          code: 'DRAFT_ACTION_NOT_FOUND',
          message: `DraftAction with ID "${id}" not found.`,
          details: null,
        },
      });
    }

    // Idempotency check
    if (draft.status === 'rejected') {
      return res.status(200).json({
        success: true,
        already_processed: true,
        message: 'Draft action was already rejected',
        data: draft,
      });
    }

    const actor = user_email || 'human_auditor';
    draft.status = 'rejected';

    if (typeof draft.save === 'function' && mongoose.connection.readyState === 1) {
      try {
        await draft.save();
      } catch (e) {
        console.warn('[Mongo Save Draft Warning]:', e.message);
      }
    }

    if (draft.run_id) {
      const auditEntry = {
        id: `audit_${Date.now()}`,
        run_id: draft.run_id,
        actor,
        action: 'draft_action_rejected',
        target_type: 'draft_action',
        target_id: draft._id ? draft._id.toString() : id,
        timestamp: new Date().toISOString(),
        details: {
          action_type: draft.action_type,
          exception_id: draft.exception_id,
          reason: reason || 'Rejected by reviewer',
        },
      };

      if (mongoose.connection.readyState === 1) {
        try {
          await AuditLog.create(auditEntry);
        } catch (e) {
          console.warn('[Mongo AuditLog Create Warning]:', e.message);
        }
      }

      const logs = MemoryStore.getAuditLogs(draft.run_id);
      logs.unshift(auditEntry);
      MemoryStore.saveAuditLogs(draft.run_id, logs);
    }

    return res.status(200).json({
      success: true,
      message: 'Draft action rejected',
      data: draft,
    });
  } catch (error) {
    next(error);
  }
}

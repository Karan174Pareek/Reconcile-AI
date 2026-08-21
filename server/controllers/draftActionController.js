import DraftAction from '../models/DraftAction.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Controller: Get draft remediation actions for a run
 * GET /api/runs/:run_id/draft-actions
 */
export async function getRunDraftActions(req, res, next) {
  try {
    const { run_id } = req.params;
    const { status } = req.query;

    const query = { run_id };
    if (status && status !== 'all') query.status = status;

    const draftActions = await DraftAction.find(query).sort({ created_at: -1 }).lean();

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

    const draft = await DraftAction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { exception_id: id }],
    });

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
        message: `Draft action was already approved at ${draft.executed_at?.toISOString() || 'earlier time'}`,
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

    await draft.save();

    // Sandboxed Dispatch Simulation (e.g. Mailtrap / Sandbox Journal Logger)
    const effectiveContent = draft.was_edited && draft.edited_content ? draft.edited_content : draft.draft_content;
    console.log(`[HITL Sandbox Dispatch] Action "${draft.action_type}" approved by ${actor}:`, JSON.stringify(effectiveContent));

    // Audit Logging
    await AuditLog.create({
      run_id: draft.run_id,
      actor,
      action: 'draft_action_approved',
      target_type: 'draft_action',
      target_id: draft._id.toString(),
      details: {
        action_type: draft.action_type,
        exception_id: draft.exception_id,
        was_edited: draft.was_edited,
        dispatched_sandbox: true,
      },
    });

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

    const draft = await DraftAction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { exception_id: id }],
    });

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
    await draft.save();

    // Audit Logging
    await AuditLog.create({
      run_id: draft.run_id,
      actor,
      action: 'draft_action_rejected',
      target_type: 'draft_action',
      target_id: draft._id.toString(),
      details: {
        action_type: draft.action_type,
        exception_id: draft.exception_id,
        reason: reason || 'Rejected by reviewer',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Draft action rejected',
      data: draft,
    });
  } catch (error) {
    next(error);
  }
}

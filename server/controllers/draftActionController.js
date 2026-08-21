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
 * Controller: Update status of a draft action (approve, reject, edit)
 * POST /api/draft-actions/:id/status
 */
export async function updateDraftActionStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, edited_content, user_email } = req.body;

    if (!['approved', 'rejected', 'pending_approval'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be "approved", "rejected", or "pending_approval"',
          details: null,
        },
      });
    }

    const draft = await DraftAction.findById(id);
    if (!draft) {
      return res.status(404).json({
        error: {
          code: 'DRAFT_ACTION_NOT_FOUND',
          message: `DraftAction with ID "${id}" not found.`,
          details: null,
        },
      });
    }

    const actor = user_email || 'human_auditor';
    draft.status = status;

    if (status === 'approved') {
      draft.executed_at = new Date();
    }

    if (edited_content) {
      draft.was_edited = true;
      draft.edited_content = edited_content;
    }

    await draft.save();

    await AuditLog.create({
      run_id: draft.run_id,
      actor,
      action: `draft_action_${status}`,
      target_type: 'draft_action',
      target_id: draft._id.toString(),
      details: {
        action_type: draft.action_type,
        exception_id: draft.exception_id,
        was_edited: draft.was_edited,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Draft action ${status}`,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
}

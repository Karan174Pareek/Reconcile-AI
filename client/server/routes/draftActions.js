import express from 'express';
import {
  getRunDraftActions,
  approveDraftAction,
  rejectDraftAction,
} from '../controllers/draftActionController.js';

const router = express.Router();

// Draft Actions listing & approvals
router.get('/run/:run_id', getRunDraftActions);
router.post('/:id/approve', approveDraftAction);
router.post('/:id/reject', rejectDraftAction);

export default router;

import express from 'express';
import {
  getRunDraftActions,
  updateDraftActionStatus,
} from '../controllers/draftActionController.js';

const router = express.Router();

// Draft Actions listing & status updates (approval/rejection)
router.get('/run/:run_id', getRunDraftActions);
router.post('/:id/status', updateDraftActionStatus);

export default router;

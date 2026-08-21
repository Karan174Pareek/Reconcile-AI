import express from 'express';
import {
  uploadCsvFiles,
  uploadMiddleware,
  generateSeedRun,
} from '../controllers/ingestionController.js';
import {
  executeRunHandler,
  executePass3Handler,
  reconcileAllHandler,
  getRunDetails,
  listRuns,
} from '../controllers/matchingController.js';
import { getRunExceptions } from '../controllers/exceptionController.js';
import { getRunDraftActions } from '../controllers/draftActionController.js';
import { streamAgentChat } from '../controllers/chatController.js';

const router = express.Router();

// Run management & querying
router.get('/', listRuns);
router.get('/:run_id', getRunDetails);
router.get('/:run_id/exceptions', getRunExceptions);
router.get('/:run_id/draft-actions', getRunDraftActions);

// Ingestion endpoints
router.post('/upload', uploadMiddleware, uploadCsvFiles);
router.post('/generate-seed', generateSeedRun);

// Pipeline execution
router.post('/:run_id/execute', executeRunHandler);
router.post('/:run_id/pass3', executePass3Handler);
router.post('/:run_id/reconcile-all', reconcileAllHandler);

// Conversational Agent Chat with streaming tool calls
router.post('/:run_id/chat', streamAgentChat);

export default router;

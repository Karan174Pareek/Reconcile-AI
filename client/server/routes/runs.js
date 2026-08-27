import express from 'express';
import {
  uploadCsvFiles,
  uploadMiddleware,
  generateSeedRun,
  coldResetRun,
} from '../controllers/ingestionController.js';
import {
  executeRunHandler,
  executePass3Handler,
  reconcileAllHandler,
  getRunDetails,
  listRuns,
  listRunSettlements,
  getRunSettlementDetail,
  exportRunJournalCsv,
  exportRunAuditCertificate,
} from '../controllers/matchingController.js';
import { getRunExceptions } from '../controllers/exceptionController.js';
import { getRunDraftActions } from '../controllers/draftActionController.js';
import { getRunAuditLogs } from '../controllers/auditLogController.js';
import { streamAgentChat } from '../controllers/chatController.js';

const router = express.Router();

// Run management & querying
router.get('/', listRuns);
router.get('/:run_id', getRunDetails);
router.get('/:run_id/settlements', listRunSettlements);
router.get('/:run_id/settlements/:settlement_id', getRunSettlementDetail);
router.get('/:run_id/exceptions', getRunExceptions);
router.get('/:run_id/draft-actions', getRunDraftActions);
router.get('/:run_id/audit-log', getRunAuditLogs);

// Export & Report Endpoints
router.get('/:run_id/export/journal-csv', exportRunJournalCsv);
router.get('/:run_id/export/audit-certificate', exportRunAuditCertificate);

// Ingestion endpoints
router.post('/upload', uploadMiddleware, uploadCsvFiles);
router.post('/generate-seed', generateSeedRun);
router.post('/cold-reset', coldResetRun);

// Pipeline execution
router.post('/:run_id/execute', executeRunHandler);
router.post('/:run_id/pass3', executePass3Handler);
router.post('/:run_id/reconcile-all', reconcileAllHandler);

// Conversational Agent Chat with streaming tool calls
router.post('/:run_id/chat', streamAgentChat);

export default router;

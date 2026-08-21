import express from 'express';
import {
  uploadCsvFiles,
  uploadMiddleware,
  generateSeedRun,
} from '../controllers/ingestionController.js';
import {
  executeRunHandler,
  getRunDetails,
  listRuns,
} from '../controllers/matchingController.js';

const router = express.Router();

// Run management & querying
router.get('/', listRuns);
router.get('/:run_id', getRunDetails);

// Ingestion endpoints
router.post('/upload', uploadMiddleware, uploadCsvFiles);
router.post('/generate-seed', generateSeedRun);

// Pipeline execution
router.post('/:run_id/execute', executeRunHandler);

export default router;

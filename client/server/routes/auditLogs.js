import express from 'express';
import { getRunAuditLogs } from '../controllers/auditLogController.js';

const router = express.Router();

// Audit log queries
router.get('/run/:run_id', getRunAuditLogs);

export default router;

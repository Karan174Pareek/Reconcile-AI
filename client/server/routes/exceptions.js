import express from 'express';
import {
  getRunExceptions,
  resolveException,
} from '../controllers/exceptionController.js';

const router = express.Router();

// Exception resolution & listing
router.get('/run/:run_id', getRunExceptions);
router.post('/:id/resolve', resolveException);

export default router;

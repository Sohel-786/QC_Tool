import { Router } from 'express';
import {
  getIssuedToolsReport,
  getMissingToolsReport,
  getToolHistoryLedger,
} from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/issued-tools', getIssuedToolsReport);
router.get('/missing-tools', getMissingToolsReport);
router.get('/tool-history/:toolId', getToolHistoryLedger);

export default router;

import { Router } from 'express';
import {
  getIssuedToolsReport,
  getMissingToolsReport,
  getToolHistoryLedger,
  exportIssuedToolsReport,
  exportMissingToolsReport,
  getAllToolsHistory,
  exportToolHistoryReport,
} from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/issued-tools', getIssuedToolsReport);
router.get('/missing-tools', getMissingToolsReport);
router.get('/tool-history/:toolId', getToolHistoryLedger);
router.get('/tool-history', getAllToolsHistory);

// Export routes
router.get('/export/issued-tools', exportIssuedToolsReport);
router.get('/export/missing-tools', exportMissingToolsReport);
router.get('/export/tool-history', exportToolHistoryReport);

export default router;

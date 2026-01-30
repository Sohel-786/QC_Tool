import { Router } from 'express';
import {
  getMetrics,
  getRecentIssues,
  getRecentReturns,
} from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/metrics', requirePermission('viewDashboard'), getMetrics);
router.get('/recent-issues', requirePermission('viewDashboard'), getRecentIssues);
router.get('/recent-returns', requirePermission('viewDashboard'), getRecentReturns);

export default router;

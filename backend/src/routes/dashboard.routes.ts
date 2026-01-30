import { Router } from 'express';
import {
  getMetrics,
  getRecentIssues,
  getRecentReturns,
  getDashboardAvailableItems,
  getDashboardMissingItems,
  getDashboardTotalItems,
  exportDashboardAvailableItems,
  exportDashboardMissingItems,
  exportDashboardTotalItems,
} from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/metrics', requirePermission('viewDashboard'), getMetrics);
router.get('/recent-issues', requirePermission('viewDashboard'), getRecentIssues);
router.get('/recent-returns', requirePermission('viewDashboard'), getRecentReturns);

router.get('/available-items', requirePermission('viewDashboard'), getDashboardAvailableItems);
router.get('/missing-items', requirePermission('viewDashboard'), getDashboardMissingItems);
router.get('/total-items', requirePermission('viewDashboard'), getDashboardTotalItems);

router.get('/export/available-items', requirePermission('viewDashboard'), exportDashboardAvailableItems);
router.get('/export/missing-items', requirePermission('viewDashboard'), exportDashboardMissingItems);
router.get('/export/total-items', requirePermission('viewDashboard'), exportDashboardTotalItems);

export default router;

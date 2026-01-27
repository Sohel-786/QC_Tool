import { Router } from 'express';
import {
  getMetrics,
  getRecentIssues,
  getRecentReturns,
} from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/metrics', getMetrics);
router.get('/recent-issues', getRecentIssues);
router.get('/recent-returns', getRecentReturns);

export default router;

import { Router } from 'express';
import {
  createIssue,
  getAllIssues,
  getActiveIssues,
  getIssueById,
  getIssueByIssueNo,
} from '../controllers/issues.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllIssues);
router.get('/active', getActiveIssues);
router.get('/:id', getIssueById);
router.get('/issue-no/:issueNo', getIssueByIssueNo);

// Create requires QC_USER role
router.post(
  '/',
  authMiddleware(['QC_USER']),
  [
    body('toolId').isInt().withMessage('Valid tool ID is required'),
    body('divisionId').isInt().withMessage('Valid division ID is required'),
    validateMiddleware,
  ],
  createIssue
);

export default router;

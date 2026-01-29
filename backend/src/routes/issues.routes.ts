import { Router } from 'express';
import {
  createIssue,
  getAllIssues,
  getActiveIssues,
  getIssueById,
  getIssueByIssueNo,
  getNextIssueCode,
  updateIssue,
  setIssueInactive,
  setIssueActive,
} from '../controllers/issues.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllIssues);
router.get('/active', getActiveIssues);
router.get('/next-code', getNextIssueCode);
router.get('/issue-no/:issueNo', getIssueByIssueNo);
router.get('/:id', getIssueById);

router.post(
  '/',
  authMiddleware(['QC_USER']),
  validateMiddleware([
    body("itemId").isInt().withMessage("Valid item ID is required"),
    body("companyId").isInt().withMessage("Company is required"),
    body("contractorId").isInt().withMessage("Contractor is required"),
    body("machineId").isInt().withMessage("Machine is required"),
  ]),
  createIssue
);

router.patch(
  '/:id',
  authMiddleware(['QC_USER']),
  updateIssue
);

router.patch(
  '/:id/inactive',
  authMiddleware(['QC_USER']),
  setIssueInactive
);

router.patch(
  '/:id/active',
  authMiddleware(['QC_USER']),
  setIssueActive
);

export default router;

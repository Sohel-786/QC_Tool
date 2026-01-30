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
import { requirePermission } from '../middleware/permission.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', requirePermission('viewOutward'), getAllIssues);
router.get('/active', requirePermission('viewOutward'), getActiveIssues);
router.get('/next-code', requirePermission('addOutward'), getNextIssueCode);
router.get('/issue-no/:issueNo', requirePermission('viewOutward'), getIssueByIssueNo);
router.get('/:id', requirePermission('viewOutward'), getIssueById);

router.post(
  '/',
  requirePermission('addOutward'),
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
  requirePermission('editOutward'),
  updateIssue
);

router.patch(
  '/:id/inactive',
  requirePermission('editOutward'),
  setIssueInactive
);

router.patch(
  '/:id/active',
  requirePermission('editOutward'),
  setIssueActive
);

export default router;

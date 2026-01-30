import { Router } from 'express';
import {
  createReturn,
  getAllReturns,
  getNextInwardCode,
  getReturnById,
  getReturnsByIssueId,
  updateReturn,
  setReturnActive,
  setReturnInactive,
} from '../controllers/returns.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { uploadReturnForm } from '../middleware/multer.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', requirePermission('viewInward'), getAllReturns);
router.get('/next-code', requirePermission('addInward'), getNextInwardCode);
router.get('/issue/:issueId', requirePermission('viewInward'), getReturnsByIssueId);
router.get('/:id', requirePermission('viewInward'), getReturnById);

router.post(
  '/',
  requirePermission('addInward'),
  uploadReturnForm.single('image'),
  validateMiddleware([
    body('issueId').toInt().isInt({ min: 1 }).withMessage('Valid issue ID is required'),
    body('statusId').toInt().isInt({ min: 1 }).withMessage('Status is required'),
  ]),
  createReturn
);

router.patch('/:id/active', requirePermission('editInward'), setReturnActive);
router.patch('/:id/inactive', requirePermission('editInward'), setReturnInactive);

router.patch(
  '/:id',
  requirePermission('editInward'),
  validateMiddleware([
    body('remarks').optional().isString(),
    body('statusId').optional().toInt().isInt({ min: 1 }).withMessage('Valid status is required'),
  ]),
  updateReturn
);

export default router;

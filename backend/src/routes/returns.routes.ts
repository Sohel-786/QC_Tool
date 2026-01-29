import { Router } from 'express';
import {
  createReturn,
  getAllReturns,
  getNextInwardCode,
  getReturnById,
  getReturnsByIssueId,
} from '../controllers/returns.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/multer.middleware';
import { attachIssueAndItemForReturn } from '../middleware/uploadContext.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllReturns);
router.get('/next-code', getNextInwardCode);
router.get('/issue/:issueId', getReturnsByIssueId);
router.get('/:id', getReturnById);

// Create requires QC_USER role – attachIssueAndItemForReturn runs before upload so multer can save to items/{serial}/inward/
router.post(
  '/',
  authMiddleware(['QC_USER']),
  validateMiddleware([
    body('issueId').isInt().withMessage('Valid issue ID is required'),
    body('statusId').isInt().withMessage('Status is required'),
  ]),
  attachIssueAndItemForReturn,
  upload.single('image'),
  createReturn
);

export default router;

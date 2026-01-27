import { Router } from 'express';
import {
  createReturn,
  getAllReturns,
  getReturnById,
  getReturnsByIssueId,
} from '../controllers/returns.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/multer.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllReturns);
router.get('/:id', getReturnById);
router.get('/issue/:issueId', getReturnsByIssueId);

// Create requires QC_USER role
router.post(
  '/',
  authMiddleware(['QC_USER']),
  upload.single('image'),
  [
    body('issueId').isInt().withMessage('Valid issue ID is required'),
    validateMiddleware,
  ],
  createReturn
);

export default router;

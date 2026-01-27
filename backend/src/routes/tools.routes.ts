import { Router } from 'express';
import {
  createTool,
  getAllTools,
  getAvailableTools,
  getToolById,
  updateTool,
} from '../controllers/tools.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllTools);
router.get('/available', getAvailableTools);
router.get('/:id', getToolById);

// Create and update require QC_USER role
router.post(
  '/',
  authMiddleware(['QC_USER']),
  [
    body('toolCode').notEmpty().withMessage('Tool code is required'),
    body('toolName').notEmpty().withMessage('Tool name is required'),
    validateMiddleware,
  ],
  createTool
);

router.patch(
  '/:id',
  authMiddleware(['QC_USER']),
  updateTool
);

export default router;

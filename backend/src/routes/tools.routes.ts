import { Router } from 'express';
import {
  createTool,
  deleteTool,
  getAllTools,
  getAvailableTools,
  getNextToolCode,
  getToolById,
  updateTool,
} from '../controllers/tools.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';
import { uploadToolImage } from '../middleware/multer.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllTools);
router.get('/available', getAvailableTools);
router.get('/next-code', getNextToolCode);
router.get('/:id', getToolById);

// Create and update require QC_USER role
router.post(
  '/',
  authMiddleware(['QC_USER']),
  uploadToolImage.single('image'),
  validateMiddleware([
    body('toolName').notEmpty().withMessage('Tool name is required'),
  ]),
  createTool
);

router.patch(
  '/:id',
  authMiddleware(['QC_USER']),
  uploadToolImage.single('image'),
  updateTool
);

router.delete(
  '/:id',
  authMiddleware(['QC_USER']),
  deleteTool
);

export default router;

import { Router } from 'express';
import {
  createToolCategory,
  deleteToolCategory,
  getAllToolCategories,
  getNextCategoryCode,
} from '../controllers/toolCategories.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All tool category routes require authentication
router.use(authMiddleware());

router.get('/', getAllToolCategories);
router.get('/next-code', getNextCategoryCode);
router.post('/', createToolCategory);
router.delete('/:id', deleteToolCategory);

export default router;


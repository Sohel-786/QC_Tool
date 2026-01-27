import { Router } from 'express';
import {
  createDivision,
  getAllDivisions,
  getActiveDivisions,
  getDivisionById,
  updateDivision,
} from '../controllers/divisions.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.use(authMiddleware());

router.get('/', getAllDivisions);
router.get('/active', getActiveDivisions);
router.get('/:id', getDivisionById);

// Create and update require QC_USER role
router.post(
  '/',
  authMiddleware(['QC_USER']),
  [
    body('code').notEmpty().withMessage('Division code is required'),
    body('name').notEmpty().withMessage('Division name is required'),
    validateMiddleware,
  ],
  createDivision
);

router.patch(
  '/:id',
  authMiddleware(['QC_USER']),
  updateDivision
);

export default router;

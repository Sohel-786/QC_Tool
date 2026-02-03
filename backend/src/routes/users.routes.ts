import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  deleteUser,
} from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

// All routes require manageUsers permission (QC_ADMIN has it by default)
router.use(authMiddleware());
router.use(requirePermission('manageUsers'));

router.post(
  '/',
  [
    body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').notEmpty().withMessage('Password is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn(['QC_USER', 'QC_MANAGER', 'QC_ADMIN']).withMessage('Valid role is required'),
    validateMiddleware,
  ],
  createUser
);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/deactivate', deactivateUser);
router.delete('/:id', deleteUser);

export default router;

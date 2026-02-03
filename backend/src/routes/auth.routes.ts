import { Router } from 'express';
import { login, logout, validate } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate as validateMiddleware } from '../middleware/validation.middleware';

const router = Router();

router.post(
  '/login',
  validateMiddleware([
    body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  login
);

router.post('/logout', logout);

router.post('/validate', authMiddleware(), validate);

export default router;

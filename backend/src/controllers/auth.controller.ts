import { Request, Response, NextFunction } from 'express';
import User from '../entities/user';
import { hashPassword, verifyPassword } from '../utils/auth';
import { generateToken } from '../utils/JwtToken';
import { cookieOptions } from '../constants/cookieOptions';
import { AuthError, ValidationError } from '../utils/errors';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new ValidationError('Username and password are required'));
    }

    const user = await User.findByUsername(username);

    if (!user || !user.password) {
      return next(new AuthError(401, 'Invalid credentials'));
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return next(new AuthError(401, 'Invalid credentials'));
    }

    if (!user.isActive) {
      return next(new AuthError(403, 'User account is inactive'));
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    res.cookie('access_token', token, cookieOptions);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar ?? null,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear cookie with same options it was set with
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

export const validate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If middleware passed, token is valid
    res.json({
      success: true,
      valid: true,
    });
  } catch (error: any) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (origin === allowed) return true;
  try {
    const u = new URL(origin);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie');
  }

  if (err instanceof AppError) {
    console.error('[errorHandler] AppError:', err.statusCode, err.message);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  if (err.name === 'ValidationError') {
    console.error('[errorHandler] ValidationError:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation error',
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    console.error('[errorHandler] Prisma error:', err);
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
    });
  }

  console.error('[errorHandler] Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure CORS headers are set before sending 404 response
  const origin = req.headers.origin;
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  if (origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie');
  }

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

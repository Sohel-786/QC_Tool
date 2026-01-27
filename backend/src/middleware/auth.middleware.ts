import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/JwtToken';
import { AuthError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authMiddleware = (allowedRoles?: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from cookie or Authorization header
      const token = req.cookies?.access_token || 
                   req.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new AuthError(401, 'No token provided. Please login.'));
      }

      // Verify token
      let decoded: TokenPayload;
      try {
        decoded = verifyToken(token);
      } catch (error: any) {
        return next(new AuthError(401, 'Invalid or expired token. Please login again.'));
      }

      // Check role if required
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(decoded.role)) {
          return next(new AuthError(403, 'You do not have permission to access this resource.'));
        }
      }

      // Add user data to request
      req.user = decoded;
      next();
    } catch (error: any) {
      next(new AuthError(500, error?.message || 'Authentication error'));
    }
  };
};

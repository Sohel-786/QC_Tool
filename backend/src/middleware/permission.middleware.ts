import { Request, Response, NextFunction } from 'express';
import RolePermissionEntity from '../entities/rolePermission';
import { AuthError } from '../utils/errors';

export type PermissionKey =
  | 'viewDashboard'
  | 'viewMaster'
  | 'viewOutward'
  | 'viewInward'
  | 'viewReports'
  | 'importExportMaster'
  | 'addOutward'
  | 'editOutward'
  | 'addInward'
  | 'editInward'
  | 'addMaster'
  | 'editMaster'
  | 'manageUsers'
  | 'accessSettings';

/**
 * Middleware that requires the current user's role to have the given permission.
 * QC_ADMIN always passes. Otherwise loads role_permissions for req.user.role and checks the key.
 */
export const requirePermission = (permission: PermissionKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AuthError(401, 'Authentication required.'));
      }
      if (req.user.role === 'QC_ADMIN') {
        return next();
      }
      const row = await RolePermissionEntity.getByRole(req.user.role);
      if (!row) {
        return next(new AuthError(403, 'You do not have permission to access this resource.'));
      }
      const value = (row as Record<PermissionKey, boolean>)[permission];
      if (!value) {
        return next(new AuthError(403, 'You do not have permission to perform this action.'));
      }
      next();
    } catch (error: any) {
      next(error);
    }
  };
};

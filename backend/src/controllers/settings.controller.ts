import { Request, Response, NextFunction } from "express";
import AppSettingsEntity from "../entities/appSettings";
import RolePermissionEntity from "../entities/rolePermission";
import { ValidationError } from "../utils/errors";

export const getSoftwareSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await AppSettingsEntity.getSingleton();
    res.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("[settings] getSoftwareSettings error:", error);
    next(error);
  }
};

export const updateSoftwareSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyName, softwareName, primaryColor } = req.body;

    const updateData: Record<string, unknown> = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (softwareName !== undefined) updateData.softwareName = softwareName;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;

    const settings = await AppSettingsEntity.update(updateData);
    res.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("[settings] updateSoftwareSettings error:", error);
    next(error);
  }
};

export const uploadSoftwareLogo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new ValidationError("No logo file uploaded"));
    }
    const relativePath = `settings/${file.filename}`;
    await AppSettingsEntity.update({ companyLogo: relativePath });
    const settings = await AppSettingsEntity.getSingleton();
    res.json({
      success: true,
      data: settings,
      logoUrl: `/storage/${relativePath}`,
    });
  } catch (error: unknown) {
    console.error("[settings] uploadSoftwareLogo error:", error);
    next(error);
  }
};

export const getMyPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.role) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const permissions = await RolePermissionEntity.getByRole(req.user.role);
    if (!permissions) {
      return res.status(404).json({ success: false, message: "Permissions not found for role" });
    }
    res.json({ success: true, data: permissions });
  } catch (error: unknown) {
    console.error("[settings] getMyPermissions error:", error);
    next(error);
  }
};

export const getPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const permissions = await RolePermissionEntity.getAll();
    res.json({ success: true, data: permissions });
  } catch (error: unknown) {
    console.error("[settings] getPermissions error:", error);
    next(error);
  }
};

export const updatePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { permissions } = req.body as { permissions: Array<Record<string, unknown>> };
    if (!Array.isArray(permissions)) {
      return next(new ValidationError("permissions must be an array"));
    }
    const updated = await RolePermissionEntity.upsertMany(
      permissions as Parameters<typeof RolePermissionEntity.upsertMany>[0]
    );
    res.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("[settings] updatePermissions error:", error);
    next(error);
  }
};

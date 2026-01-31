import { Request, Response, NextFunction } from "express";
import Status from "../entities/status";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  buildFormattedExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import fs from "fs";

export const createStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Status name is required"));
    }

    const status = await Status.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statuses = await Status.findAll();
    res.json({
      success: true,
      data: statuses,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getActiveStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statuses = await Status.findActive();
    res.json({
      success: true,
      data: statuses,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getStatusById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const status = await Status.findById(parseInt(id));

    if (!status) {
      return next(new NotFoundError(`Status with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const status = await Status.findById(parseInt(id));
    if (!status) {
      return next(new NotFoundError(`Status with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStatus = await Status.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedStatus,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const exportStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statuses = await Status.findAll();
    const rows = statuses.map((c) => ({
      Name: c.name,
      Active: c.isActive ? "Yes" : "No",
    }));
    const buffer = await buildFormattedExcelBuffer(rows, "Statuses");
    const filename = `statuses-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
};

export const importStatuses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new ValidationError("No file uploaded. Please upload an Excel file."));
    }
    const buffer = fs.readFileSync(file.path);
    const rawRows = parseExcelBuffer(buffer);
    fs.unlinkSync(file.path);
    const existing = await Status.findAll();
    const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));
    const seenInThisFile = new Set<string>();
    const results = { imported: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < rawRows.length; i++) {
      const row = normalizeRowKeys(rawRows[i] as Record<string, unknown>);
      const name = row.name != null ? String(row.name).trim() : "";
      if (!name) {
        results.errors.push({ row: i + 2, message: "Name is required" });
        continue;
      }
      const nameKey = name.toLowerCase();
      if (seenInThisFile.has(nameKey)) continue;
      if (existingNames.has(nameKey)) continue;
      const isActive =
        row.active == null ? true : /^(1|true|yes|y)$/i.test(String(row.active).trim());
      try {
        await Status.create({ name, isActive });
        results.imported += 1;
        seenInThisFile.add(nameKey);
        existingNames.add(nameKey);
      } catch (err) {
        results.errors.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "Failed to create",
        });
      }
    }
    res.json({
      success: true,
      data: { imported: results.imported, totalRows: rawRows.length, errors: results.errors },
    });
  } catch (error: unknown) {
    next(error);
  }
};

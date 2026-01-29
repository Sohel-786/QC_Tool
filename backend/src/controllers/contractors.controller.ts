import { Request, Response, NextFunction } from "express";
import Contractor from "../entities/contractor";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  buildExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import fs from "fs";

export const createContractor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Contractor name is required"));
    }

    const contractor = await Contractor.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: contractor,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllContractors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contractors = await Contractor.findAll();
    res.json({
      success: true,
      data: contractors,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getActiveContractors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contractors = await Contractor.findActive();
    res.json({
      success: true,
      data: contractors,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getContractorById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const contractor = await Contractor.findById(parseInt(id));

    if (!contractor) {
      return next(new NotFoundError(`Contractor with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: contractor,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateContractor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const contractor = await Contractor.findById(parseInt(id));
    if (!contractor) {
      return next(new NotFoundError(`Contractor with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedContractor = await Contractor.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedContractor,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const exportContractors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contractors = await Contractor.findAll();
    const rows = contractors.map((c) => ({
      Name: c.name,
      Active: c.isActive ? "Yes" : "No",
    }));
    const buffer = buildExcelBuffer(rows, "Contractors");
    const filename = `contractors-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
};

export const importContractors = async (
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
    const existing = await Contractor.findAll();
    const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
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
        await Contractor.create({ name, isActive });
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

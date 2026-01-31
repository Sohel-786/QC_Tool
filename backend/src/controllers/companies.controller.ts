import { Request, Response, NextFunction } from "express";
import Company from "../entities/company";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  buildFormattedExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import fs from "fs";

export const createCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Company name is required"));
    }

    const company = await Company.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await Company.findAll();
    res.json({
      success: true,
      data: companies,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getActiveCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await Company.findActive();
    res.json({
      success: true,
      data: companies,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(parseInt(id));

    if (!company) {
      return next(new NotFoundError(`Company with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const company = await Company.findById(parseInt(id));
    if (!company) {
      return next(new NotFoundError(`Company with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCompany = await Company.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error: unknown) {
    next(error);
  }
};

const EXPORT_HEADERS = ["Name", "Active"];

export const exportCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await Company.findAll();
    const rows = companies.map((c) => ({
      Name: c.name,
      Active: c.isActive ? "Yes" : "No",
    }));
    const buffer = await buildFormattedExcelBuffer(rows, "Companies");
    const filename = `companies-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
};

export const importCompanies = async (
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
    const existing = await Company.findAll();
    const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
    const seenInThisFile = new Set<string>();
    const results: { imported: number; errors: { row: number; message: string }[] } = {
      imported: 0,
      errors: [],
    };
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
        row.active == null
          ? true
          : /^(1|true|yes|y)$/i.test(String(row.active).trim());
      try {
        await Company.create({ name, isActive });
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
      data: {
        imported: results.imported,
        totalRows: rawRows.length,
        errors: results.errors,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};

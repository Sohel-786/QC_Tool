import { Request, Response, NextFunction } from "express";
import ItemCategory from "../entities/itemCategory";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import {
  buildExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import fs from "fs";

export const createItemCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return next(new ValidationError("Item category name is required"));
    }
    const normalizedName = name.trim();
    if (await ItemCategory.nameExists(normalizedName)) {
      return next(
        new ConflictError("Item category with this name already exists")
      );
    }
    const category = await ItemCategory.create({
      name: normalizedName,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, data: category });
  } catch (e) {
    next(e);
  }
};

export const getAllItemCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await ItemCategory.findAll();
    res.json({ success: true, data: categories });
  } catch (e) {
    next(e);
  }
};

export const getActiveItemCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await ItemCategory.findActive();
    res.json({ success: true, data: categories });
  } catch (e) {
    next(e);
  }
};

export const getItemCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid item category id"));
    }
    const category = await ItemCategory.findById(id);
    if (!category) {
      return next(
        new NotFoundError(`Item category with ID ${id} not found`)
      );
    }
    res.json({ success: true, data: category });
  } catch (e) {
    next(e);
  }
};

export const updateItemCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid item category id"));
    }
    const { name, isActive } = req.body;
    const category = await ItemCategory.findById(id);
    if (!category) {
      return next(
        new NotFoundError(`Item category with ID ${id} not found`)
      );
    }
    const updateData: Record<string, unknown> = {};
    if (name && typeof name === "string" && name.trim()) {
      const n = name.trim();
      if (n !== category.name && (await ItemCategory.nameExists(n))) {
        return next(
          new ConflictError("Item category with this name already exists")
        );
      }
      updateData.name = n;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    const updated = await ItemCategory.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const exportItemCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await ItemCategory.findAll();
    const rows = categories.map((c) => ({
      Name: c.name,
      Active: c.isActive ? "Yes" : "No",
    }));
    const buffer = buildExcelBuffer(rows, "Item Categories");
    const filename = `item-categories-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const importItemCategories = async (
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
    const existing = await ItemCategory.findAll();
    const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
    const seenInThisFile = new Set<string>();
    const results = { imported: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < rawRows.length; i++) {
      const row = normalizeRowKeys(rawRows[i] as Record<string, unknown>);
      const name = row.name != null ? String(row.name).trim() : "";
      if (!name || name.length < 2) {
        results.errors.push({ row: i + 2, message: "Name is required (min 2 characters)" });
        continue;
      }
      const nameKey = name.toLowerCase();
      if (seenInThisFile.has(nameKey)) continue;
      if (existingNames.has(nameKey)) continue;
      const isActive =
        row.active == null ? true : /^(1|true|yes|y)$/i.test(String(row.active).trim());
      try {
        await ItemCategory.create({ name, isActive });
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
  } catch (e) {
    next(e);
  }
};

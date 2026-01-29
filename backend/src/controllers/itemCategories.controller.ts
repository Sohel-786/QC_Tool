import { Request, Response, NextFunction } from "express";
import ItemCategory from "../entities/itemCategory";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createItemCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return next(new ValidationError("Item category name is required"));
    }
    const normalizedName = name.trim();
    if (!code) {
      const count = await ItemCategory.getCount();
      code = generateNextCode("CAT", count);
    }
    if (await ItemCategory.codeExists(code)) {
      return next(
        new ConflictError("Item category with this code already exists")
      );
    }
    if (await ItemCategory.nameExists(normalizedName)) {
      return next(
        new ConflictError("Item category with this name already exists")
      );
    }
    const category = await ItemCategory.create({
      code,
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
    const { code, name, isActive } = req.body;
    const category = await ItemCategory.findById(id);
    if (!category) {
      return next(
        new NotFoundError(`Item category with ID ${id} not found`)
      );
    }
    const updateData: Record<string, unknown> = {};
    if (code && code !== category.code) {
      if (await ItemCategory.codeExists(code)) {
        return next(
          new ConflictError("Item category with this code already exists")
        );
      }
      updateData.code = code;
    }
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

export const getNextItemCategoryCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await ItemCategory.getCount();
    const nextCode = generateNextCode("CAT", count);
    res.json({ success: true, data: { nextCode } });
  } catch (e) {
    next(e);
  }
};

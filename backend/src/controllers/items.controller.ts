import { Request, Response, NextFunction } from "express";
import Item from "../entities/item";
import ItemCategory from "../entities/itemCategory";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { ItemStatus } from "@prisma/client";
import fs from "fs";
import path from "path";
import { generateNextCode } from "../utils/codeGenerator";

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { itemCode, itemName, description, serialNumber, categoryId, isActive } =
      req.body;
    const file = req.file;

    if (!itemName) {
      return next(new ValidationError("Item name is required"));
    }
    if (!serialNumber) {
      return next(new ValidationError("Serial number is required"));
    }

    if (!itemCode) {
      const count = await Item.getCount();
      itemCode = generateNextCode("ITEM", count);
    }

    if (await Item.codeExists(itemCode)) {
      return next(new ConflictError("Item with this code already exists"));
    }
    const trimmedSerial = String(serialNumber).trim();
    if (await Item.serialNumberExists(trimmedSerial)) {
      return next(
        new ConflictError("Item with this serial number already exists")
      );
    }

    let parsedCategoryId: number | null = null;
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      categoryId !== ""
    ) {
      const id = Number(categoryId);
      if (Number.isNaN(id)) {
        return next(new ValidationError("Invalid item category"));
      }
      const cat = await ItemCategory.findById(id);
      if (!cat) {
        return next(
          new ValidationError("Selected item category does not exist")
        );
      }
      parsedCategoryId = id;
    }

    let imagePath: string | null = null;
    if (file) {
      imagePath = `items/${file.filename}`;
    }

    const item = await Item.create({
      itemCode,
      itemName,
      serialNumber: trimmedSerial,
      description: description || null,
      image: imagePath,
      categoryId: parsedCategoryId,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

export const getAllItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const s = status ? (status as ItemStatus) : undefined;
    const items = await Item.findAll(s);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const getActiveItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await Item.findActive();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const getAvailableItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await Item.findAvailable();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const getItemsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return next(new ValidationError("Invalid category id"));
    }
    const items = await Item.findActiveByCategory(categoryId);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const getItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid item id"));
    }
    const item = await Item.findById(id);
    if (!item) {
      return next(new NotFoundError(`Item with ID ${id} not found`));
    }
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid item id"));
    }
    const {
      itemCode,
      itemName,
      description,
      status,
      serialNumber,
      categoryId,
      isActive,
    } = req.body;
    const file = req.file;

    const item = await Item.findById(id);
    if (!item) {
      return next(new NotFoundError(`Item with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};

    if (itemCode && itemCode !== item.itemCode) {
      if (await Item.codeExists(itemCode)) {
        return next(
          new ConflictError("Item with this code already exists")
        );
      }
      updateData.itemCode = itemCode;
    }
    if (itemName != null) updateData.itemName = itemName;
    if (description !== undefined) updateData.description = description;
    if (status != null) updateData.status = status;
    if (isActive !== undefined) {
      updateData.isActive = isActive === true || isActive === "true";
    }

    if (serialNumber !== undefined) {
      const trimmed = serialNumber ? String(serialNumber).trim() : null;
      if (!trimmed) {
        updateData.serialNumber = null;
      } else if (trimmed !== item.serialNumber) {
        if (
          await Item.serialNumberExistsExcluding(trimmed, id)
        ) {
          return next(
            new ConflictError(
              "Item with this serial number already exists"
            )
          );
        }
        updateData.serialNumber = trimmed;
      }
    }

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        updateData.categoryId = null;
      } else {
        const cid = Number(categoryId);
        if (Number.isNaN(cid)) {
          return next(new ValidationError("Invalid item category"));
        }
        const cat = await ItemCategory.findById(cid);
        if (!cat) {
          return next(
            new ValidationError("Selected item category does not exist")
          );
        }
        updateData.categoryId = cid;
      }
    }

    if (file) {
      const prev = item as typeof item & { image?: string | null };
      if (prev.image) {
        const oldPath = path.join(
          __dirname,
          "..",
          "storage",
          prev.image
        );
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Error deleting old item image:", err);
        }
      }
      updateData.image = `items/${file.filename}`;
    }

    const updated = await Item.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const getNextItemCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await Item.getCount();
    const nextCode = generateNextCode("ITEM", count);
    res.json({ success: true, data: { nextCode } });
  } catch (e) {
    next(e);
  }
};

import { Request, Response, NextFunction } from "express";
import Item from "../entities/item";
import ItemCategory from "../entities/itemCategory";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { ItemStatus } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";
import fs from "fs";
import path from "path";
import {
  buildExcelBuffer,
  buildFormattedExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import { getItemMasterImagePath } from "../utils/storagePath";

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { itemName, description, serialNumber, categoryId, isActive } =
      req.body;
    const file = req.file;

    const trimmedItemName = itemName != null ? String(itemName).trim() : "";
    const trimmedSerial = serialNumber != null ? String(serialNumber).trim() : "";
    if (!trimmedItemName) {
      return next(new ValidationError("Item name is required"));
    }
    if (!trimmedSerial) {
      return next(new ValidationError("Serial number is required"));
    }
    if (!file) {
      return next(
        new ValidationError("Item image is required. Please take a photo.")
      );
    }

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

    const imagePath = getItemMasterImagePath(trimmedSerial, file.filename);

    const item = await Item.create({
      itemName: trimmedItemName,
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

export const getMissingItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await Item.findActive(ItemStatus.MISSING);
    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const itemIds = items.map((i) => i.id);
    const sourceReturns = await prisma.return.findMany({
      where: {
        itemId: { in: itemIds },
        condition: "Missing",
      },
      orderBy: { returnedAt: "desc" },
      select: { itemId: true, returnCode: true },
    });
    const sourceByItemId: Record<number, string | null> = {};
    for (const r of sourceReturns) {
      if (r.itemId != null && sourceByItemId[r.itemId] == null) {
        sourceByItemId[r.itemId] = r.returnCode;
      }
    }
    const data = items.map((item) => ({
      ...item,
      sourceInwardCode: sourceByItemId[item.id] ?? null,
    }));
    res.json({ success: true, data });
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

    if (itemName != null) {
      const trimmedName = String(itemName).trim();
      if (!trimmedName) {
        return next(new ValidationError("Item name is required"));
      }
      updateData.itemName = trimmedName;
    }
    if (description !== undefined) updateData.description = description;
    if (status != null) updateData.status = status;
    if (isActive !== undefined) {
      if (req.user!.role !== "QC_ADMIN") {
        return next(
          new ValidationError("Only Admin is allowed to change active status")
        );
      }
      updateData.isActive = isActive === true || isActive === "true";
    }

    if (serialNumber !== undefined) {
      const trimmed = serialNumber ? String(serialNumber).trim() : null;
      if (!trimmed) {
        updateData.serialNumber = null;
      } else if (trimmed !== item.serialNumber) {
        if (await Item.serialNumberExistsExcluding(trimmed, id)) {
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
      updateData.image = getItemMasterImagePath(
        item.serialNumber ?? "",
        file.filename
      );
    }

    const updated = await Item.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const exportItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [items, categories] = await Promise.all([
      Item.findAll(),
      ItemCategory.findAll(),
    ]);
    const categoryMap: Record<number, string> = {};
    for (const c of categories) categoryMap[c.id] = c.name;
    const rows = items.map((i) => ({
      Name: i.itemName,
      "Serial Number": i.serialNumber ?? "",
      Category: i.categoryId != null ? categoryMap[i.categoryId] ?? "" : "",
      Description: i.description ?? "",
      Active: i.isActive ? "Yes" : "No",
    }));
    const buffer = await buildFormattedExcelBuffer(rows, "Items");
    const filename = `items-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const importItems = async (
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
    const categories = await ItemCategory.findAll();
    const categoryByName: Record<string, number> = {};
    for (const c of categories) categoryByName[c.name.toLowerCase().trim()] = c.id;
    const seenSerialInThisFile = new Set<string>();
    const results = { imported: 0, errors: [] as { row: number; message: string }[] };
    for (let i = 0; i < rawRows.length; i++) {
      const row = normalizeRowKeys(rawRows[i] as Record<string, unknown>);
      const itemName = row.name != null ? String(row.name).trim() : "";
      const serialNumber = row.serial_number != null ? String(row.serial_number).trim() : row.serialnumber != null ? String(row.serialnumber).trim() : "";
      if (!itemName) {
        results.errors.push({ row: i + 2, message: "Name is required" });
        continue;
      }
      if (!serialNumber) {
        results.errors.push({ row: i + 2, message: "Serial Number is required" });
        continue;
      }
      const serialKey = serialNumber.toLowerCase();
      if (seenSerialInThisFile.has(serialKey)) continue;
      if (await Item.serialNumberExists(serialNumber)) continue;
      let categoryId: number | null = null;
      const categoryVal = row.category != null ? String(row.category).trim() : "";
      if (categoryVal) {
        const found = categoryByName[categoryVal.toLowerCase()];
        if (found) categoryId = found;
        else {
          results.errors.push({ row: i + 2, message: `Category "${categoryVal}" not found` });
          continue;
        }
      }
      const description = row.description != null ? String(row.description).trim() || null : null;
      const isActive =
        row.active == null ? true : /^(1|true|yes|y)$/i.test(String(row.active).trim());
      try {
        await Item.create({
          itemName,
          serialNumber,
          description,
          categoryId,
          isActive,
        });
        results.imported += 1;
        seenSerialInThisFile.add(serialKey);
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

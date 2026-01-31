import { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import Location from "../entities/location";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  buildExcelBuffer,
  buildFormattedExcelBuffer,
  getExcelMime,
  parseExcelBuffer,
  normalizeRowKeys,
} from "../utils/excel";

export const createLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Location name is required"));
    }

    const location = await Location.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllLocations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const locations = await Location.findAll();
    res.json({
      success: true,
      data: locations,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getActiveLocations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const locations = await Location.findActive();
    res.json({
      success: true,
      data: locations,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getLocationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(parseInt(id));

    if (!location) {
      return next(new NotFoundError(`Location with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const location = await Location.findById(parseInt(id));
    if (!location) {
      return next(new NotFoundError(`Location with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedLocation = await Location.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedLocation,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const exportLocations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const locations = await Location.findAll();
    const rows = locations.map((c) => ({
      Name: c.name,
      Active: c.isActive ? "Yes" : "No",
    }));
    const buffer = await buildFormattedExcelBuffer(rows, "Locations");
    const filename = `locations-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
};

export const importLocations = async (
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
    const existing = await Location.findAll();
    const existingNames = new Set(existing.map((l) => l.name.trim().toLowerCase()));
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
        await Location.create({ name, isActive });
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

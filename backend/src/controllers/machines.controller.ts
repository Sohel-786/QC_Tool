import { Request, Response, NextFunction } from "express";
import Machine from "../entities/machine";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  buildExcelBuffer,
  parseExcelBuffer,
  normalizeRowKeys,
  getExcelMime,
} from "../utils/excel";
import fs from "fs";

export const createMachine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Machine name is required"));
    }

    const machine = await Machine.create({
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, data: machine });
  } catch (e) {
    next(e);
  }
};

export const getAllMachines = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const machines = await Machine.findAll();
    res.json({ success: true, data: machines });
  } catch (e) {
    next(e);
  }
};

export const getActiveMachines = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const machines = await Machine.findActive();
    res.json({ success: true, data: machines });
  } catch (e) {
    next(e);
  }
};

export const getMachineById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid machine id"));
    }
    const machine = await Machine.findById(id);
    if (!machine) {
      return next(new NotFoundError(`Machine with ID ${id} not found`));
    }
    res.json({ success: true, data: machine });
  } catch (e) {
    next(e);
  }
};

export const updateMachine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid machine id"));
    }
    const { name, isActive } = req.body;

    const machine = await Machine.findById(id);
    if (!machine) {
      return next(new NotFoundError(`Machine with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (name != null) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Machine.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const exportMachines = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const machines = await Machine.findAll();
    const rows = machines.map((m) => ({
      Name: m.name,
      Active: m.isActive ? "Yes" : "No",
    }));
    const buffer = buildExcelBuffer(rows, "Machines");
    const filename = `machines-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const importMachines = async (
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
    const existing = await Machine.findAll();
    const existingNames = new Set(existing.map((m) => m.name.trim().toLowerCase()));
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
        await Machine.create({ name, isActive });
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
  } catch (e) {
    next(e);
  }
};

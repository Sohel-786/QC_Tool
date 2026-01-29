import { Request, Response, NextFunction } from "express";
import Machine from "../entities/machine";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createMachine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Machine name is required"));
    }

    if (!code) {
      const count = await Machine.getCount();
      code = generateNextCode("MCH", count);
    }

    if (await Machine.codeExists(code)) {
      return next(new ConflictError("Machine with this code already exists"));
    }

    const machine = await Machine.create({
      code,
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
    const { code, name, isActive } = req.body;

    const machine = await Machine.findById(id);
    if (!machine) {
      return next(new NotFoundError(`Machine with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (code && code !== machine.code) {
      if (await Machine.codeExists(code)) {
        return next(new ConflictError("Machine with this code already exists"));
      }
      updateData.code = code;
    }
    if (name != null) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Machine.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const getNextMachineCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await Machine.getCount();
    const nextCode = generateNextCode("MCH", count);
    res.json({ success: true, data: { nextCode } });
  } catch (e) {
    next(e);
  }
};

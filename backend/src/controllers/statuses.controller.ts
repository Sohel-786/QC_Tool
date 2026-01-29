import { Request, Response, NextFunction } from "express";
import Status from "../entities/status";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Status name is required"));
    }

    if (!code) {
      const statusCount = await Status.getCount();
      code = generateNextCode("STS", statusCount);
    }

    const codeExists = await Status.codeExists(code);
    if (codeExists) {
      return next(new ConflictError("Status with this code already exists"));
    }

    const status = await Status.create({
      code,
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
    const { code, name, isActive } = req.body;

    const status = await Status.findById(parseInt(id));
    if (!status) {
      return next(new NotFoundError(`Status with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (code && code !== status.code) {
      const codeExists = await Status.codeExists(code);
      if (codeExists) {
        return next(new ConflictError("Status with this code already exists"));
      }
      updateData.code = code;
    }
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

export const getNextStatusCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statusCount = await Status.getCount();
    const nextCode = generateNextCode("STS", statusCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: unknown) {
    next(error);
  }
};

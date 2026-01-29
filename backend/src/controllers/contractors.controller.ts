import { Request, Response, NextFunction } from "express";
import Contractor from "../entities/contractor";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createContractor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Contractor name is required"));
    }

    if (!code) {
      const contractorCount = await Contractor.getCount();
      code = generateNextCode("CTR", contractorCount);
    }

    const codeExists = await Contractor.codeExists(code);
    if (codeExists) {
      return next(new ConflictError("Contractor with this code already exists"));
    }

    const contractor = await Contractor.create({
      code,
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
    const { code, name, isActive } = req.body;

    const contractor = await Contractor.findById(parseInt(id));
    if (!contractor) {
      return next(new NotFoundError(`Contractor with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (code && code !== contractor.code) {
      const codeExists = await Contractor.codeExists(code);
      if (codeExists) {
        return next(
          new ConflictError("Contractor with this code already exists")
        );
      }
      updateData.code = code;
    }
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

export const getNextContractorCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const contractorCount = await Contractor.getCount();
    const nextCode = generateNextCode("CTR", contractorCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: unknown) {
    next(error);
  }
};

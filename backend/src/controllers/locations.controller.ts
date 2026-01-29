import { Request, Response, NextFunction } from "express";
import Location from "../entities/location";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Location name is required"));
    }

    if (!code) {
      const locationCount = await Location.getCount();
      code = generateNextCode("LOC", locationCount);
    }

    const codeExists = await Location.codeExists(code);
    if (codeExists) {
      return next(new ConflictError("Location with this code already exists"));
    }

    const location = await Location.create({
      code,
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
    const { code, name, isActive } = req.body;

    const location = await Location.findById(parseInt(id));
    if (!location) {
      return next(new NotFoundError(`Location with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (code && code !== location.code) {
      const codeExists = await Location.codeExists(code);
      if (codeExists) {
        return next(new ConflictError("Location with this code already exists"));
      }
      updateData.code = code;
    }
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

export const getNextLocationCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const locationCount = await Location.getCount();
    const nextCode = generateNextCode("LOC", locationCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: unknown) {
    next(error);
  }
};

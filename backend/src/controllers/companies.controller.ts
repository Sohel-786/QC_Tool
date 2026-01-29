import { Request, Response, NextFunction } from "express";
import Company from "../entities/company";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { generateNextCode } from "../utils/codeGenerator";

export const createCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError("Company name is required"));
    }

    if (!code) {
      const companyCount = await Company.getCount();
      code = generateNextCode("COM", companyCount);
    }

    const codeExists = await Company.codeExists(code);
    if (codeExists) {
      return next(new ConflictError("Company with this code already exists"));
    }

    const company = await Company.create({
      code,
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getAllCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await Company.findAll();
    res.json({
      success: true,
      data: companies,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getActiveCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await Company.findActive();
    res.json({
      success: true,
      data: companies,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(parseInt(id));

    if (!company) {
      return next(new NotFoundError(`Company with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { code, name, isActive } = req.body;

    const company = await Company.findById(parseInt(id));
    if (!company) {
      return next(new NotFoundError(`Company with ID ${id} not found`));
    }

    const updateData: Record<string, unknown> = {};
    if (code && code !== company.code) {
      const codeExists = await Company.codeExists(code);
      if (codeExists) {
        return next(new ConflictError("Company with this code already exists"));
      }
      updateData.code = code;
    }
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCompany = await Company.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedCompany,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const getNextCompanyCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyCount = await Company.getCount();
    const nextCode = generateNextCode("COM", companyCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: unknown) {
    next(error);
  }
};

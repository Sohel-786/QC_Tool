import { Request, Response, NextFunction } from 'express';
import Division from '../entities/division';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { generateNextCode } from '../utils/codeGenerator';

export const createDivision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { code, name, isActive } = req.body;

    if (!name) {
      return next(new ValidationError('Division name is required'));
    }

    // Auto-generate division code if not provided
    if (!code) {
      const divisionCount = await Division.getCount();
      code = generateNextCode('DIV', divisionCount);
    }

    const codeExists = await Division.codeExists(code);
    if (codeExists) {
      return next(new ConflictError('Division with this code already exists'));
    }

    const division = await Division.create({
      code,
      name,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      data: division,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllDivisions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisions = await Division.findAll();
    res.json({
      success: true,
      data: divisions,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getActiveDivisions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisions = await Division.findActive();
    res.json({
      success: true,
      data: divisions,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getDivisionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const division = await Division.findById(parseInt(id));

    if (!division) {
      return next(new NotFoundError(`Division with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: division,
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateDivision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, isActive } = req.body;

    const division = await Division.findById(parseInt(id));
    if (!division) {
      return next(new NotFoundError(`Division with ID ${id} not found`));
    }

    const updateData: any = {};
    if (code && code !== division.code) {
      const codeExists = await Division.codeExists(code);
      if (codeExists) {
        return next(new ConflictError('Division with this code already exists'));
      }
      updateData.code = code;
    }
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedDivision = await Division.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedDivision,
    });
  } catch (error: any) {
    next(error);
  }
};

export const deleteDivision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const divisionId = parseInt(id);

    if (Number.isNaN(divisionId)) {
      return next(new ValidationError('Invalid division id'));
    }

    const division = await Division.findById(divisionId);
    if (!division) {
      return next(new NotFoundError(`Division with ID ${id} not found`));
    }

    const issuesCount = await Division.countIssuesByDivisionId(divisionId);
    if (issuesCount > 0) {
      return next(
        new BadRequestError(
          'This division is in use by outward (issue) records and cannot be deleted',
        ),
      );
    }

    await Division.delete(divisionId);

    res.json({
      success: true,
      message: 'Division deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

export const getNextDivisionCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const divisionCount = await Division.getCount();
    const nextCode = generateNextCode('DIV', divisionCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: any) {
    next(error);
  }
};

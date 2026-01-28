import { Request, Response, NextFunction } from 'express';
import Return from '../entities/return';
import Issue from '../entities/issue';
import Tool from '../entities/tool';
import { BadRequestError, NotFoundError, ValidationError } from '../utils/errors';
import { ToolStatus } from '@prisma/client';
import { generateNextCode } from '../utils/codeGenerator';

export const createReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { issueId, remarks } = req.body;
    const returnedBy = req.user!.id;
    const file = req.file;

    if (!issueId) {
      return next(new ValidationError('Issue ID is required'));
    }

    if (!file) {
      return next(new ValidationError('Return image is required'));
    }

    // Check if issue exists and is not already returned
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return next(new NotFoundError('Issue not found'));
    }

    if (issue.isReturned) {
      return next(new BadRequestError('This issue has already been returned'));
    }

    const imagePath = `returns/${file.filename}`;

    // Auto-generate inward (return) code
    const returnCount = await Return.getCount();
    const returnCode = generateNextCode('INWARD', returnCount);

    // Create return record
    const return_ = await Return.create({
      returnCode,
      issueId,
      returnedBy,
      returnImage: imagePath,
      remarks,
    });

    // Mark issue as returned
    await Issue.markAsReturned(issueId);

    // Update tool status back to AVAILABLE
    await Tool.updateStatus(issue.toolId, ToolStatus.AVAILABLE);

    res.status(201).json({
      success: true,
      data: return_,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const returns = await Return.findAll();
    res.json({
      success: true,
      data: returns,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getReturnById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const return_ = await Return.findById(parseInt(id));

    if (!return_) {
      return next(new NotFoundError(`Return with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: return_,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getReturnsByIssueId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { issueId } = req.params;
    const returns = await Return.findByIssueId(parseInt(issueId));

    res.json({
      success: true,
      data: returns,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getNextInwardCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const returnCount = await Return.getCount();
    const nextCode = generateNextCode('INWARD', returnCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: any) {
    next(error);
  }
};

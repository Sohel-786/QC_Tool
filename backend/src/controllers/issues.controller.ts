import { Request, Response, NextFunction } from 'express';
import Issue from '../entities/issue';
import Tool from '../entities/tool';
import Division from '../entities/division';
import { BadRequestError, NotFoundError, ValidationError } from '../utils/errors';
import { ToolStatus } from '@prisma/client';

export const createIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolId, divisionId, issuedTo, remarks } = req.body;
    const issuedBy = req.user!.id;

    if (!toolId || !divisionId) {
      return next(new ValidationError('Tool and division are required'));
    }

    // Check if tool exists and is available
    const tool = await Tool.findById(toolId);
    if (!tool) {
      return next(new NotFoundError('Tool not found'));
    }
    if (tool.status !== ToolStatus.AVAILABLE) {
      return next(new BadRequestError('Tool is not available for issue'));
    }

    // Check if division exists and is active
    const division = await Division.findById(divisionId);
    if (!division) {
      return next(new NotFoundError('Division not found'));
    }
    if (!division.isActive) {
      return next(new BadRequestError('Division is inactive and cannot receive tools'));
    }

    // Generate issue number
    const issueNo = await Issue.generateIssueNo();

    // Create issue
    const issue = await Issue.create({
      issueNo,
      toolId,
      divisionId,
      issuedBy,
      issuedTo,
      remarks,
    });

    // Update tool status to ISSUED
    await Tool.updateStatus(toolId, ToolStatus.ISSUED);

    res.status(201).json({
      success: true,
      data: issue,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issues = await Issue.findAll();
    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getActiveIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issues = await Issue.findActive();
    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getIssueById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(parseInt(id));

    if (!issue) {
      return next(new NotFoundError(`Issue with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getIssueByIssueNo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { issueNo } = req.params;
    const issue = await Issue.findByIssueNo(issueNo);

    if (!issue) {
      return next(new NotFoundError(`Issue with number ${issueNo} not found`));
    }

    res.json({
      success: true,
      data: issue,
    });
  } catch (error: any) {
    next(error);
  }
};

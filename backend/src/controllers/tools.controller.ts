import { Request, Response, NextFunction } from 'express';
import Tool from '../entities/tool';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ToolStatus } from '@prisma/client';

export const createTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolCode, toolName, description } = req.body;

    if (!toolCode || !toolName) {
      return next(new ValidationError('Tool code and name are required'));
    }

    const codeExists = await Tool.codeExists(toolCode);
    if (codeExists) {
      return next(new ConflictError('Tool with this code already exists'));
    }

    const tool = await Tool.create({
      toolCode,
      toolName,
      description,
    });

    res.status(201).json({
      success: true,
      data: tool,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const toolStatus = status ? (status as ToolStatus) : undefined;
    const tools = await Tool.findAll(toolStatus);

    res.json({
      success: true,
      data: tools,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAvailableTools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tools = await Tool.findAvailable();
    res.json({
      success: true,
      data: tools,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getToolById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tool = await Tool.findById(parseInt(id));

    if (!tool) {
      return next(new NotFoundError(`Tool with ID ${id} not found`));
    }

    res.json({
      success: true,
      data: tool,
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { toolCode, toolName, description, status } = req.body;

    const tool = await Tool.findById(parseInt(id));
    if (!tool) {
      return next(new NotFoundError(`Tool with ID ${id} not found`));
    }

    const updateData: any = {};
    if (toolCode && toolCode !== tool.toolCode) {
      const codeExists = await Tool.codeExists(toolCode);
      if (codeExists) {
        return next(new ConflictError('Tool with this code already exists'));
      }
      updateData.toolCode = toolCode;
    }
    if (toolName) updateData.toolName = toolName;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const updatedTool = await Tool.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedTool,
    });
  } catch (error: any) {
    next(error);
  }
};

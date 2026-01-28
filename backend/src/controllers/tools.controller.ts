import { Request, Response, NextFunction } from 'express';
import Tool from '../entities/tool';
import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ToolStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { prisma } from '../external-libraries/dbClient';
import { generateNextCode } from '../utils/codeGenerator';

// Temporary untyped prisma reference to avoid type mismatch until prisma generate is run
const prismaAny = prisma as any;

export const createTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { toolCode, toolName, description, serialNumber, categoryId } = req.body;
    const file = req.file;

    if (!toolName) {
      return next(new ValidationError('Tool name is required'));
    }

    if (!serialNumber) {
      return next(new ValidationError('Serial number is required'));
    }

    // Auto-generate toolCode if not provided
    if (!toolCode) {
      const toolCount = await Tool.getCount();
      toolCode = generateNextCode('TOOL', toolCount);
    }

    const codeExists = await Tool.codeExists(toolCode);
    if (codeExists) {
      return next(new ConflictError('Tool with this code already exists'));
    }

    // Enforce unique serial number if provided
    if (serialNumber) {
      const existingBySerial = await prismaAny.tool.count({
        where: { serialNumber },
      });
      if (existingBySerial > 0) {
        return next(new ConflictError('Tool with this serial number already exists'));
      }
    }

    let parsedCategoryId: number | undefined;
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      parsedCategoryId = Number(categoryId);
      if (Number.isNaN(parsedCategoryId)) {
        return next(new ValidationError('Invalid tool category'));
      }

      const category = await prismaAny.toolCategory.findUnique({
        where: { id: parsedCategoryId },
      });

      if (!category) {
        return next(new ValidationError('Selected tool category does not exist'));
      }
    }

    let imagePath: string | undefined;
    if (file) {
      imagePath = `tools/${file.filename}`;
    }

    const tool = await Tool.create({
      toolCode,
      toolName,
      serialNumber,
      description,
      image: imagePath,
      categoryId: parsedCategoryId ?? null,
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

export const getNextToolCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const toolCount = await Tool.getCount();
    const nextCode = generateNextCode('TOOL', toolCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { toolCode, toolName, description, status, serialNumber, categoryId } = req.body;
    const file = req.file;

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

    // Handle serial number update (ensure uniqueness)
    if (serialNumber !== undefined) {
      const trimmedSerial = serialNumber ? String(serialNumber).trim() : null;
      if (!trimmedSerial) {
        updateData.serialNumber = null;
      } else if (trimmedSerial !== (tool as any).serialNumber) {
        const existingBySerial = await prismaAny.tool.count({
          where: {
            serialNumber: trimmedSerial,
            id: { not: tool.id },
          },
        });
        if (existingBySerial > 0) {
          return next(new ConflictError('Tool with this serial number already exists'));
        }
        updateData.serialNumber = trimmedSerial;
      }
    }

    // Handle category update
    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === '') {
        updateData.categoryId = null;
      } else {
        const parsedCategoryId = Number(categoryId);
        if (Number.isNaN(parsedCategoryId)) {
          return next(new ValidationError('Invalid tool category'));
        }

        const category = await prismaAny.toolCategory.findUnique({
          where: { id: parsedCategoryId },
        });

        if (!category) {
          return next(new ValidationError('Selected tool category does not exist'));
        }

        updateData.categoryId = parsedCategoryId;
      }
    }

    // Handle image upload
    if (file) {
      // Delete old image if it exists
      // Type assertion needed until Prisma client is regenerated
      const toolWithImage = tool as typeof tool & { image?: string | null };
      if (toolWithImage.image) {
        const oldImagePath = path.join(__dirname, '..', 'storage', toolWithImage.image);
        try {
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) {
          console.error('Error deleting old image:', err);
          // Continue even if deletion fails
        }
      }
      updateData.image = `tools/${file.filename}`;
    }

    const updatedTool = await Tool.update(parseInt(id), updateData);

    res.json({
      success: true,
      data: updatedTool,
    });
  } catch (error: any) {
    next(error);
  }
};

export const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const toolId = parseInt(id);

    if (Number.isNaN(toolId)) {
      return next(new ValidationError('Invalid tool id'));
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return next(new NotFoundError(`Tool with ID ${id} not found`));
    }

    const issuesCount = await Tool.countIssuesByToolId(toolId);
    if (issuesCount > 0) {
      return next(
        new BadRequestError(
          'This tool is in use by outward (issue) records and cannot be deleted',
        ),
      );
    }

    // Delete image file from storage if present
    const toolWithImage = tool as typeof tool & { image?: string | null };
    if (toolWithImage.image) {
      const oldImagePath = path.join(__dirname, '..', 'storage', toolWithImage.image);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (err) {
        console.error('Error deleting tool image:', err);
        // Continue with tool deletion even if file delete fails
      }
    }

    await Tool.delete(toolId);

    res.json({
      success: true,
      message: 'Tool deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

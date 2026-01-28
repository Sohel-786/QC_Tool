import { Request, Response, NextFunction } from 'express';
import ToolCategory from '../entities/toolCategory';
import { prisma } from '../external-libraries/dbClient';
import { ConflictError, NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { generateNextCode } from '../utils/codeGenerator';

export const createToolCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return next(new ValidationError('Category name is required'));
    }

    const normalizedName = name.trim();

    const nameExists = await ToolCategory.nameExists(normalizedName);
    if (nameExists) {
      return next(new ConflictError('Tool category with this name already exists'));
    }

    const category = await ToolCategory.create({
      name: normalizedName,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getAllToolCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await ToolCategory.findAll();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    next(error);
  }
};

export const deleteToolCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    if (Number.isNaN(categoryId)) {
      return next(new ValidationError('Invalid category id'));
    }

    const category = await ToolCategory.findById(categoryId);
    if (!category) {
      return next(new NotFoundError(`Tool category with ID ${id} not found`));
    }

    // Check if any tool is using this category (raw SQL to avoid Prisma client relation issues)
    const toolsCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM tools WHERE categoryId = ${categoryId}
    `;
    const toolsUsingCategory = Number(toolsCountResult[0]?.count ?? 0);

    // Check if any outward (issue) uses a tool in this category
    const issuesCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM issues i
      INNER JOIN tools t ON i.toolId = t.id
      WHERE t.categoryId = ${categoryId}
    `;
    const issuesUsingCategory = Number(issuesCountResult[0]?.count ?? 0);

    if (toolsUsingCategory > 0 || issuesUsingCategory > 0) {
      return next(
        new BadRequestError(
          'This category is in use by existing tools or outward records and cannot be deleted',
        ),
      );
    }

    await ToolCategory.delete(categoryId);

    res.json({
      success: true,
      message: 'Tool category deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
};

export const getNextCategoryCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryCount = await ToolCategory.getCount();
    const nextCode = generateNextCode('CAT', categoryCount);
    res.json({
      success: true,
      data: { nextCode },
    });
  } catch (error: any) {
    next(error);
  }
};


import { Request, Response, NextFunction } from 'express';
import { prisma } from '../external-libraries/dbClient';
import { ToolStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export const getIssuedToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMissingToolsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tools = await prisma.tool.findMany({
      where: { status: ToolStatus.MISSING },
      include: {
        issues: true,
      },
      orderBy: { toolName: 'asc' },
    });

    res.json({
      success: true,
      data: tools,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getToolHistoryLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolId } = req.params;

    const tool = await prisma.tool.findUnique({
      where: { id: parseInt(toolId) },
    });

    if (!tool) {
      return next(new NotFoundError('Tool not found'));
    }

    const issues = await prisma.issue.findMany({
      where: { toolId: parseInt(toolId) },
      include: {
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        returns: {
          include: {
            returnedByUser: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        tool,
        history: issues.map((issue) => ({
          issue,
          returns: issue.returns,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
};

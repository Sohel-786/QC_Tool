import { Request, Response, NextFunction } from 'express';
import { prisma } from '../external-libraries/dbClient';
import { ToolStatus } from '@prisma/client';

export const getMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalTools,
      availableTools,
      issuedTools,
      missingTools,
      totalIssues,
      activeIssues,
      totalReturns,
    ] = await Promise.all([
      prisma.tool.count(),
      prisma.tool.count({ where: { status: ToolStatus.AVAILABLE } }),
      prisma.tool.count({ where: { status: ToolStatus.ISSUED } }),
      prisma.tool.count({ where: { status: ToolStatus.MISSING } }),
      prisma.issue.count(),
      prisma.issue.count({ where: { isReturned: false } }),
      prisma.return.count(),
    ]);

    res.json({
      success: true,
      data: {
        tools: {
          total: totalTools,
          available: availableTools,
          issued: issuedTools,
          missing: missingTools,
        },
        issues: {
          total: totalIssues,
          active: activeIssues,
        },
        returns: {
          total: totalReturns,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getRecentIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const issues = await prisma.issue.findMany({
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
      take: limit,
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getRecentReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const returns = await prisma.return.findMany({
      include: {
        issue: {
          include: {
            tool: true,
          },
        },
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { returnedAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: returns,
    });
  } catch (error: any) {
    next(error);
  }
};

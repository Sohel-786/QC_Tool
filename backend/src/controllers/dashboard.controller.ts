import { Request, Response, NextFunction } from "express";
import { prisma } from "../external-libraries/dbClient";
import { ItemStatus } from "@prisma/client";

export const getMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalItems,
      availableItems,
      issuedItems,
      missingItems,
      totalIssues,
      activeIssues,
      totalReturns,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: ItemStatus.AVAILABLE } }),
      prisma.item.count({ where: { status: ItemStatus.ISSUED } }),
      prisma.item.count({ where: { status: ItemStatus.MISSING } }),
      prisma.issue.count(),
      prisma.issue.count({ where: { isReturned: false } }),
      prisma.return.count(),
    ]);

    res.json({
      success: true,
      data: {
        items: {
          total: totalItems,
          available: availableItems,
          issued: issuedItems,
          missing: missingItems,
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
  } catch (e) {
    next(e);
  }
};

export const getRecentIssues = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(String(req.query.limit), 10) || 10;
    const issues = await prisma.issue.findMany({
      include: {
        item: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
      take: limit,
    });
    res.json({ success: true, data: issues });
  } catch (e) {
    next(e);
  }
};

export const getRecentReturns = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(String(req.query.limit), 10) || 10;
    const returns = await prisma.return.findMany({
      include: {
        issue: {
          include: {
            item: true,
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
      orderBy: { returnedAt: "desc" },
      take: limit,
    });
    res.json({ success: true, data: returns });
  } catch (e) {
    next(e);
  }
};

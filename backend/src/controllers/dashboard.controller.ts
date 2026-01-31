import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";
import { ItemStatus } from "@prisma/client";
import { buildExcelBuffer, getExcelMime } from "../utils/excel";

function parseDashboardItemFilters(query: Record<string, unknown>): {
  categoryIds: number[];
  search: string;
} {
  const categoryIds: number[] = [];
  const raw = query.categoryIds ?? query.categoryId;
  if (typeof raw === "string") {
    raw.split(",").forEach((s) => {
      const n = parseInt(s.trim(), 10);
      if (!Number.isNaN(n)) categoryIds.push(n);
    });
  }
  const search = typeof query.search === "string" ? query.search.trim() : "";
  return { categoryIds, search };
}

function buildDashboardItemsWhere(
  status: ItemStatus | ItemStatus[],
  filters: { categoryIds: number[]; search: string }
): Prisma.ItemWhereInput {
  const conditions: Prisma.ItemWhereInput[] = [{ isActive: true }];
  if (Array.isArray(status)) {
    conditions.push({ status: { in: status } });
  } else {
    conditions.push({ status });
  }
  if (filters.categoryIds.length > 0) {
    conditions.push({ categoryId: { in: filters.categoryIds } });
  }
  if (filters.search.length > 0) {
    conditions.push({
      OR: [
        { itemName: { contains: filters.search } },
        { serialNumber: { contains: filters.search } },
        { description: { contains: filters.search } },
      ],
    });
  }
  return { AND: conditions };
}

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
        location: true,
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
            location: true,
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

export const getDashboardAvailableItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(ItemStatus.AVAILABLE, filters);
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const getDashboardMissingItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(ItemStatus.MISSING, filters);
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

/** Total = Available + Missing (for dashboard "Total Items" table) */
export const getDashboardTotalItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(
      [ItemStatus.AVAILABLE, ItemStatus.MISSING],
      filters
    );
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

function exportItemsToExcel(
  items: Array<{
    itemName: string;
    serialNumber: string | null;
    description: string | null;
    status: string;
    categoryId: number | null;
    category?: { name: string } | null;
  }>,
  sheetName: string
): Buffer {
  const rows = items.map((item, idx) => ({
    "Sr.No": idx + 1,
    "Item Name": item.itemName,
    "Serial Number": item.serialNumber ?? "N/A",
    Category: item.category?.name ?? "N/A",
    Description: item.description ?? "N/A",
    Status: item.status,
  }));
  return buildExcelBuffer(rows, sheetName);
}

export const exportDashboardAvailableItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(ItemStatus.AVAILABLE, filters);
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    const buffer = exportItemsToExcel(items, "Available Items");
    const filename = `dashboard-available-items-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const exportDashboardMissingItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(ItemStatus.MISSING, filters);
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    const buffer = exportItemsToExcel(items, "Missing Items");
    const filename = `dashboard-missing-items-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const exportDashboardTotalItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseDashboardItemFilters(req.query as Record<string, unknown>);
    const where = buildDashboardItemsWhere(
      [ItemStatus.AVAILABLE, ItemStatus.MISSING],
      filters
    );
    const items = await prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { itemName: "asc" },
    });
    const buffer = exportItemsToExcel(items, "Total Items");
    const filename = `dashboard-total-items-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

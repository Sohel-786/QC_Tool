import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";
import { ItemStatus } from "@prisma/client";
import { NotFoundError } from "../utils/errors";
import {
  parseTransactionFiltersFromQuery,
  type TransactionListFilters,
} from "../types/filter";
import { buildExcelBuffer, getExcelMime } from "../utils/excel";

const ROW_LIMITS = [25, 50, 75, 100] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

function parsePageLimit(query: Record<string, unknown>): { page: number; limit: number } {
  const page = Math.max(1, parseInt(String(query.page || DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const rawLimit = parseInt(String(query.limit || query.rows || DEFAULT_LIMIT), 10);
  const limit = ROW_LIMITS.includes(rawLimit as (typeof ROW_LIMITS)[number])
    ? rawLimit
    : DEFAULT_LIMIT;
  return { page, limit };
}

function buildIssuedReportWhere(filters: TransactionListFilters): Prisma.IssueWhereInput {
  const conditions: Prisma.IssueWhereInput[] = [{ isReturned: false }];
  if (filters.status === "active") conditions.push({ isActive: true });
  if (filters.status === "inactive") conditions.push({ isActive: false });
  if (filters.companyIds?.length) conditions.push({ companyId: { in: filters.companyIds } });
  if (filters.contractorIds?.length) conditions.push({ contractorId: { in: filters.contractorIds } });
  if (filters.machineIds?.length) conditions.push({ machineId: { in: filters.machineIds } });
  if (filters.itemIds?.length) conditions.push({ itemId: { in: filters.itemIds } });
  if (filters.operatorName?.trim()) {
    conditions.push({ issuedTo: { contains: filters.operatorName.trim() } });
  }
  const searchTerm = filters.search?.trim() ?? "";
  if (searchTerm.length > 0) {
    conditions.push({
      OR: [
        { issueNo: { contains: searchTerm } },
        { item: { itemName: { contains: searchTerm } } },
        { item: { serialNumber: { contains: searchTerm } } },
        { company: { name: { contains: searchTerm } } },
        { contractor: { name: { contains: searchTerm } } },
        { machine: { name: { contains: searchTerm } } },
        { issuedTo: { contains: searchTerm } },
      ],
    });
  }
  return { AND: conditions };
}

/** Missing items: items with status MISSING, filtered by their issues (company, contractor, machine, item, operator, search). */
function buildMissingReportWhere(filters: TransactionListFilters): Prisma.ItemWhereInput {
  const conditions: Prisma.ItemWhereInput[] = [{ status: ItemStatus.MISSING }];
  if (filters.companyIds?.length) {
    conditions.push({
      issues: { some: { companyId: { in: filters.companyIds } } },
    });
  }
  if (filters.contractorIds?.length) {
    conditions.push({
      issues: { some: { contractorId: { in: filters.contractorIds } } },
    });
  }
  if (filters.machineIds?.length) {
    conditions.push({
      issues: { some: { machineId: { in: filters.machineIds } } },
    });
  }
  if (filters.itemIds?.length) {
    conditions.push({ id: { in: filters.itemIds } });
  }
  if (filters.operatorName?.trim()) {
    conditions.push({
      issues: { some: { issuedTo: { contains: filters.operatorName.trim() } } },
    });
  }
  const searchTerm = filters.search?.trim() ?? "";
  if (searchTerm.length > 0) {
    conditions.push({
      OR: [
        { itemName: { contains: searchTerm } },
        { serialNumber: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { issues: { some: { issueNo: { contains: searchTerm } } } },
        { issues: { some: { company: { name: { contains: searchTerm } } } } },
        { issues: { some: { contractor: { name: { contains: searchTerm } } } } },
        { issues: { some: { machine: { name: { contains: searchTerm } } } } },
        { issues: { some: { issuedTo: { contains: searchTerm } } } },
      ],
    });
  }
  return { AND: conditions };
}

export const getIssuedItemsReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>);
    const where = buildIssuedReportWhere(filters);
    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          item: true,
          company: true,
          contractor: true,
          machine: true,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issue.count({ where }),
    ]);
    res.json({
      success: true,
      data: issues,
      total,
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
};

export const getMissingItemsReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>);
    const where = buildMissingReportWhere(filters);
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { issues: true, category: true },
        orderBy: { itemName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);
    res.json({
      success: true,
      data: items,
      total,
      page,
      limit,
    });
  } catch (e) {
    next(e);
  }
};

/** Ledger: traceability for a single item. Returns item + flattened rows (issued then returns) in date order. */
export const getItemHistoryLedger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (Number.isNaN(itemId)) {
      return next(new NotFoundError("Invalid item ID"));
    }
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { category: true },
    });
    if (!item) {
      return next(new NotFoundError("Item not found"));
    }
    const issues = await prisma.issue.findMany({
      where: { itemId },
      include: {
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        returns: {
          orderBy: { returnedAt: "asc" },
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
      orderBy: { issuedAt: "desc" },
    });
    type LedgerRow = {
      type: "issue" | "return";
      date: Date;
      issueNo: string;
      description: string;
      user?: string;
      remarks?: string | null;
      returnCode?: string | null;
    };
    const rows: LedgerRow[] = [];
    for (const issue of issues) {
      rows.push({
        type: "issue",
        date: issue.issuedAt,
        issueNo: issue.issueNo,
        description: `Issued to ${issue.issuedTo ?? "—"}`,
        user:
          issue.issuedByUser &&
          `${issue.issuedByUser.firstName ?? ""} ${issue.issuedByUser.lastName ?? ""}`.trim(),
        remarks: issue.remarks ?? undefined,
      });
      for (const r of issue.returns) {
        rows.push({
          type: "return",
          date: r.returnedAt,
          issueNo: issue.issueNo,
          description: "Returned",
          user:
            r.returnedByUser &&
            `${r.returnedByUser.firstName ?? ""} ${r.returnedByUser.lastName ?? ""}`.trim(),
          remarks: r.remarks ?? undefined,
          returnCode: r.returnCode ?? undefined,
        });
      }
    }
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>);
    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);
    res.json({
      success: true,
      data: { item, rows: data, total, page, limit },
    });
  } catch (e) {
    next(e);
  }
};

export const getAllItemsHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        category: true,
        issues: {
          include: {
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
          orderBy: { issuedAt: "desc" },
        },
      },
      orderBy: { itemName: "asc" },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const exportIssuedItemsReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const where = buildIssuedReportWhere(filters);
    const issues = await prisma.issue.findMany({
      where,
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
    });
    const rows = issues.map((issue, idx) => ({
      "Sr.No": idx + 1,
      "Issue No": issue.issueNo,
      "Entry Date": new Date(issue.issuedAt).toLocaleString(),
      "Serial No": issue.item?.serialNumber ?? "N/A",
      "Item Name": issue.item?.itemName ?? "N/A",
      "Issued To": issue.issuedTo ?? "N/A",
      "Issued By": issue.issuedByUser
        ? `${issue.issuedByUser.firstName ?? ""} ${issue.issuedByUser.lastName ?? ""}`.trim()
        : "N/A",
      Status: issue.isReturned ? "Returned" : "Active",
      "Issued Date": new Date(issue.issuedAt).toLocaleString(),
      Remarks: issue.remarks ?? "N/A",
    }));
    const buffer = buildExcelBuffer(rows, "Active Issues");
    const filename = `active-issues-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const exportMissingItemsReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const where = buildMissingReportWhere(filters);
    const items = await prisma.item.findMany({
      where,
      include: { issues: true },
      orderBy: { itemName: "asc" },
    });
    const rows = items.map((item, idx) => ({
      "Sr.No": idx + 1,
      "Serial No": item.serialNumber ?? "N/A",
      "Item Name": item.itemName,
      Description: item.description ?? "N/A",
      Status: item.status,
      "Total Issues": item.issues?.length ?? 0,
      "Created At": new Date(item.createdAt).toLocaleString(),
      "Last Updated": new Date(item.updatedAt).toLocaleString(),
    }));
    const buffer = buildExcelBuffer(rows, "Missing Items");
    const filename = `missing-items-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const exportItemHistoryReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemIdParam = req.query.itemId;
    const itemId = itemIdParam != null ? parseInt(String(itemIdParam), 10) : NaN;
    if (!Number.isNaN(itemId) && itemId > 0) {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });
      if (!item) {
        return next(new NotFoundError("Item not found"));
      }
      const issues = await prisma.issue.findMany({
        where: { itemId },
        include: {
          issuedByUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          returns: {
            orderBy: { returnedAt: "asc" },
            include: {
              returnedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { issuedAt: "desc" },
      });
      const flatRows: Record<string, unknown>[] = [];
      let sr = 0;
      for (const issue of issues) {
        sr += 1;
        flatRows.push({
          "Sr.No": sr,
          "Serial No": item.serialNumber ?? "N/A",
          "Item Name": item.itemName,
          "Issue No": issue.issueNo,
          "Event": "Issued",
          Date: new Date(issue.issuedAt).toLocaleString(),
          "Issued To": issue.issuedTo ?? "N/A",
          "By": `${issue.issuedByUser?.firstName ?? ""} ${issue.issuedByUser?.lastName ?? ""}`.trim() || "N/A",
          Remarks: issue.remarks ?? "N/A",
        });
        for (const r of issue.returns) {
          sr += 1;
          flatRows.push({
            "Sr.No": sr,
            "Serial No": item.serialNumber ?? "N/A",
            "Item Name": item.itemName,
            "Issue No": issue.issueNo,
            "Event": "Returned",
            Date: new Date(r.returnedAt).toLocaleString(),
            "Return Code": r.returnCode ?? "N/A",
            "By": `${r.returnedByUser?.firstName ?? ""} ${r.returnedByUser?.lastName ?? ""}`.trim() || "N/A",
            Remarks: r.remarks ?? "N/A",
          });
        }
      }
      const buffer = buildExcelBuffer(flatRows, "Ledger");
      const filename = `ledger-report-${item.itemName.replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;
      res.setHeader("Content-Type", getExcelMime());
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    }
    const items = await prisma.item.findMany({
      include: {
        issues: {
          include: {
            issuedByUser: {
              select: { firstName: true, lastName: true },
            },
            returns: {
              include: {
                returnedByUser: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { issuedAt: "desc" },
        },
      },
      orderBy: { itemName: "asc" },
    });
    const historyRows: Record<string, unknown>[] = [];
    let rowIndex = 0;
    for (const item of items) {
      if (item.issues.length === 0) {
        rowIndex += 1;
        historyRows.push({
          "Sr.No": rowIndex,
          "Serial No": item.serialNumber ?? "N/A",
          "Item Name": item.itemName,
          "Issue No": "N/A",
          "Issued By": "N/A",
          "Issued To": "N/A",
          "Issued Date": "N/A",
          "Returned Date": "N/A",
          "Returned By": "N/A",
          Status: item.status,
        });
      } else {
        for (const issue of item.issues) {
          if (issue.returns.length > 0) {
            for (const r of issue.returns) {
              rowIndex += 1;
              historyRows.push({
                "Sr.No": rowIndex,
                "Serial No": item.serialNumber ?? "N/A",
                "Item Name": item.itemName,
                "Issue No": issue.issueNo,
                "Issued By": `${issue.issuedByUser?.firstName ?? ""} ${issue.issuedByUser?.lastName ?? ""}`.trim() || "N/A",
                "Issued To": issue.issuedTo ?? "N/A",
                "Issued Date": new Date(issue.issuedAt).toLocaleString(),
                "Returned Date": new Date(r.returnedAt).toLocaleString(),
                "Returned By": `${r.returnedByUser?.firstName ?? ""} ${r.returnedByUser?.lastName ?? ""}`.trim() || "N/A",
                Status: issue.isReturned ? "Returned" : "Active",
              });
            }
          } else {
            rowIndex += 1;
            historyRows.push({
              "Sr.No": rowIndex,
              "Serial No": item.serialNumber ?? "N/A",
              "Item Name": item.itemName,
              "Issue No": issue.issueNo,
              "Issued By": `${issue.issuedByUser?.firstName ?? ""} ${issue.issuedByUser?.lastName ?? ""}`.trim() || "N/A",
              "Issued To": issue.issuedTo ?? "N/A",
              "Issued Date": new Date(issue.issuedAt).toLocaleString(),
              "Returned Date": "N/A",
              "Returned By": "N/A",
              Status: issue.isReturned ? "Returned" : "Active",
            });
          }
        }
      }
    }
    const buffer = buildExcelBuffer(historyRows, "Item History");
    const filename = `item-history-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

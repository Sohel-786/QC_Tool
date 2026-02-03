import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";
import { ItemStatus } from "@prisma/client";
import { NotFoundError } from "../utils/errors";
import {
  parseTransactionFiltersFromQuery,
  type TransactionListFilters,
} from "../types/filter";
import { buildFormattedExcelBuffer, getExcelMime } from "../utils/excel";

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
  if (filters.locationIds?.length) conditions.push({ locationId: { in: filters.locationIds } });
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
        { location: { name: { contains: searchTerm } } },
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
  if (filters.locationIds?.length) {
    conditions.push({
      issues: { some: { locationId: { in: filters.locationIds } } },
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
        { issues: { some: { location: { name: { contains: searchTerm } } } } },
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
        include: {
          issues: {
            include: { location: true },
            orderBy: { issuedAt: "desc" },
          },
          category: true,
        },
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

type LedgerRow = {
  type: "issue" | "return";
  date: Date;
  issueNo: string;
  description: string;
  company?: string | null;
  contractor?: string | null;
  machine?: string | null;
  location?: string | null;
  user?: string;
  remarks?: string | null;
  returnCode?: string | null;
  condition?: string | null;
  inwardNo?: string | null;
};

function parseLedgerFilters(
  query: Record<string, unknown>
): TransactionListFilters & { dateFrom?: string; dateTo?: string } {
  const filters = parseTransactionFiltersFromQuery(query as Record<string, string>);
  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom.trim() || undefined : undefined;
  const dateTo = typeof query.dateTo === "string" ? query.dateTo.trim() || undefined : undefined;
  return { ...filters, dateFrom, dateTo };
}

function buildLedgerIssueWhere(
  itemId: number,
  filters: TransactionListFilters
): Prisma.IssueWhereInput {
  const conditions: Prisma.IssueWhereInput[] = [{ itemId }];
  if (filters.companyIds?.length) conditions.push({ companyId: { in: filters.companyIds } });
  if (filters.contractorIds?.length) conditions.push({ contractorId: { in: filters.contractorIds } });
  if (filters.machineIds?.length) conditions.push({ machineId: { in: filters.machineIds } });
  if (filters.locationIds?.length) conditions.push({ locationId: { in: filters.locationIds } });
  if (filters.operatorName?.trim()) {
    conditions.push({ issuedTo: { contains: filters.operatorName.trim() } });
  }
  const searchTerm = filters.search?.trim() ?? "";
  if (searchTerm.length > 0) {
    conditions.push({
      OR: [
        { issueNo: { contains: searchTerm } },
        { issuedTo: { contains: searchTerm } },
        { remarks: { contains: searchTerm } },
        { location: { name: { contains: searchTerm } } },
      ],
    });
  }
  return { AND: conditions };
}

function buildLedgerReturnWhere(
  itemId: number,
  filters: TransactionListFilters
): Prisma.ReturnWhereInput {
  const conditions: Prisma.ReturnWhereInput[] = [{ itemId, isActive: true, issueId: null }];
  if (filters.companyIds?.length) conditions.push({ companyId: { in: filters.companyIds } });
  if (filters.contractorIds?.length) conditions.push({ contractorId: { in: filters.contractorIds } });
  if (filters.machineIds?.length) conditions.push({ machineId: { in: filters.machineIds } });
  if (filters.locationIds?.length) conditions.push({ locationId: { in: filters.locationIds } });
  if (filters.operatorName?.trim()) {
    conditions.push({
      returnedByUser: {
        OR: [
          { firstName: { contains: filters.operatorName.trim() } },
          { lastName: { contains: filters.operatorName.trim() } },
        ],
      },
    });
  }
  const searchTerm = filters.search?.trim() ?? "";
  if (searchTerm.length > 0) {
    conditions.push({
      OR: [
        { returnCode: { contains: searchTerm } },
        { remarks: { contains: searchTerm } },
        { location: { name: { contains: searchTerm } } },
        { condition: { contains: searchTerm } },
      ],
    });
  }
  return { AND: conditions };
}

function buildLedgerRows(
  itemId: number,
  issues: Array<{
    issueNo: string;
    issuedAt: Date;
    issuedTo: string | null;
    remarks: string | null;
    location?: { name: string } | null;
    company?: { name: string } | null;
    contractor?: { name: string } | null;
    machine?: { name: string } | null;
    issuedByUser: { firstName: string; lastName: string } | null;
    returns: Array<{
      returnedAt: Date;
      returnCode: string | null;
      remarks: string | null;
      condition?: string | null;
      returnedByUser: { firstName: string; lastName: string } | null;
    }>;
  }>,
  standaloneReturns: Array<{
    returnedAt: Date;
    returnCode: string | null;
    remarks: string | null;
    condition?: string | null;
    returnedByUser: { firstName: string; lastName: string } | null;
    company?: { name: string } | null;
    contractor?: { name: string } | null;
    machine?: { name: string } | null;
    location?: { name: string } | null;
  }>
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const issue of issues) {
    const issueUser =
      issue.issuedByUser &&
      `${issue.issuedByUser.firstName ?? ""} ${issue.issuedByUser.lastName ?? ""}`.trim();
    const locationName = issue.location?.name ?? null;
    const companyName = issue.company?.name ?? null;
    const contractorName = issue.contractor?.name ?? null;
    const machineName = issue.machine?.name ?? null;
    rows.push({
      type: "issue",
      date: issue.issuedAt,
      issueNo: issue.issueNo,
      description: `Issued to ${issue.issuedTo ?? "—"}`,
      company: companyName,
      contractor: contractorName,
      machine: machineName,
      location: locationName,
      user: issueUser || undefined,
      remarks: issue.remarks ?? undefined,
      condition: "OK",
    });
    for (const r of issue.returns) {
      const cond = (r as { condition?: string | null }).condition;
      const returnUser =
        r.returnedByUser &&
        `${r.returnedByUser.firstName ?? ""} ${r.returnedByUser.lastName ?? ""}`.trim();
      rows.push({
        type: "return",
        date: r.returnedAt,
        issueNo: issue.issueNo,
        description: cond ? `Returned (${cond})` : "Returned",
        company: companyName,
        contractor: contractorName,
        machine: machineName,
        location: locationName,
        user: returnUser || undefined,
        remarks: r.remarks ?? undefined,
        returnCode: r.returnCode ?? undefined,
        condition: cond ?? undefined,
        inwardNo: r.returnCode ?? undefined,
      });
    }
  }
  for (const r of standaloneReturns) {
    const cond = (r as { condition?: string | null }).condition;
    const returnUser =
      r.returnedByUser &&
      `${r.returnedByUser.firstName ?? ""} ${r.returnedByUser.lastName ?? ""}`.trim();
    const locName = r.location?.name ?? null;
    const companyName = r.company?.name ?? null;
    const contractorName = r.contractor?.name ?? null;
    const machineName = r.machine?.name ?? null;
    rows.push({
      type: "return",
      date: r.returnedAt,
      issueNo: "—",
      description: cond ? `Received (Missing item) (${cond})` : "Received (Missing item)",
      company: companyName ?? undefined,
      contractor: contractorName ?? undefined,
      machine: machineName ?? undefined,
      location: locName ?? undefined,
      user: returnUser || undefined,
      remarks: r.remarks ?? undefined,
      returnCode: r.returnCode ?? undefined,
      condition: cond ?? undefined,
      inwardNo: r.returnCode ?? undefined,
    });
  }
  return rows;
}

function filterLedgerRowsByDate(
  rows: LedgerRow[],
  dateFrom?: string,
  dateTo?: string
): LedgerRow[] {
  if (!dateFrom && !dateTo) return rows;
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  return rows.filter((row) => {
    const d = new Date(row.date).getTime();
    if (from != null && d < from.getTime()) return false;
    if (to != null && d > to.getTime()) return false;
    return true;
  });
}

/** Ledger: traceability for a single item. Full history, filters, newest first. */
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
    const filters = parseLedgerFilters(req.query as Record<string, unknown>);
    const issueWhere = buildLedgerIssueWhere(itemId, filters);

    const [issues, standaloneReturns] = await Promise.all([
      prisma.issue.findMany({
        where: issueWhere,
        include: {
          location: true,
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
      }),
      prisma.return.findMany({
        where: buildLedgerReturnWhere(itemId, filters),
        include: {
          returnedByUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          company: true,
          contractor: true,
          machine: true,
          location: true,
        } as Record<string, unknown>,
        orderBy: { returnedAt: "asc" },
      }),
    ]);

    let rows = buildLedgerRows(
      itemId,
      issues as Parameters<typeof buildLedgerRows>[1],
      standaloneReturns as unknown as Parameters<typeof buildLedgerRows>[2]
    );

    if (filters.conditions?.length) {
      rows = rows.filter((r) => r.condition && filters.conditions.includes(r.condition));
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.issueNo.toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term) ||
          (r.company && r.company.toLowerCase().includes(term)) ||
          (r.contractor && r.contractor.toLowerCase().includes(term)) ||
          (r.machine && r.machine.toLowerCase().includes(term)) ||
          (r.location && r.location.toLowerCase().includes(term)) ||
          (r.user && r.user.toLowerCase().includes(term)) ||
          (r.remarks && r.remarks.toLowerCase().includes(term)) ||
          (r.returnCode && r.returnCode.toLowerCase().includes(term)) ||
          (r.condition && r.condition.toLowerCase().includes(term)) ||
          (r.inwardNo && r.inwardNo.toLowerCase().includes(term))
      );
    }

    rows = filterLedgerRowsByDate(rows, filters.dateFrom, filters.dateTo);
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = rows.length;
    const { page, limit } = parsePageLimit(req.query as Record<string, unknown>);
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);

    const serializableRows = data.map((r) => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString() : r.date,
    }));

    res.json({
      success: true,
      data: { item, rows: serializableRows, total, page, limit },
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
    });
    const rows = issues.map((issue, idx) => ({
      "Sr.No": idx + 1,
      "Issue No": issue.issueNo,
      "Entry Date": new Date(issue.issuedAt).toLocaleString(),
      "Serial No": issue.item?.serialNumber ?? "N/A",
      "Item Name": issue.item?.itemName ?? "N/A",
      Location: (issue as { location?: { name: string } | null }).location?.name ?? "N/A",
      "Issued To": issue.issuedTo ?? "N/A",
      "Issued By": issue.issuedByUser
        ? `${issue.issuedByUser.firstName ?? ""} ${issue.issuedByUser.lastName ?? ""}`.trim()
        : "N/A",
      Status: issue.isReturned ? "Returned" : "Active",
      "Issued Date": new Date(issue.issuedAt).toLocaleString(),
      Remarks: issue.remarks ?? "N/A",
    }));
    const buffer = await buildFormattedExcelBuffer(rows, "Active Issues");
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
      include: {
        issues: {
          include: { location: true },
          orderBy: { issuedAt: "desc" },
        },
      },
      orderBy: { itemName: "asc" },
    });
    const rows = items.map((item, idx) => {
      const lastIssue = (item.issues as Array<{ location?: { name: string } | null }>)?.[0];
      const locationName = lastIssue?.location?.name ?? "N/A";
      return {
        "Sr.No": idx + 1,
        "Serial No": item.serialNumber ?? "N/A",
        "Item Name": item.itemName,
        Location: locationName,
        Description: item.description ?? "N/A",
        Status: item.status,
        "Total Issues": item.issues?.length ?? 0,
        "Created At": new Date(item.createdAt).toLocaleString(),
        "Last Updated": new Date(item.updatedAt).toLocaleString(),
      };
    });
    const buffer = await buildFormattedExcelBuffer(rows, "Missing Items");
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
        include: { category: true },
      });
      if (!item) {
        return next(new NotFoundError("Item not found"));
      }
      const filters = parseLedgerFilters(req.query as Record<string, unknown>);
      const issueWhere = buildLedgerIssueWhere(itemId, filters);

      const [issues, standaloneReturns] = await Promise.all([
        prisma.issue.findMany({
          where: issueWhere,
          include: {
            location: true,
            company: true,
            contractor: true,
            machine: true,
            issuedByUser: {
              select: { firstName: true, lastName: true },
            },
            returns: {
              orderBy: { returnedAt: "asc" },
              include: {
                returnedByUser: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { issuedAt: "desc" },
        }),
        prisma.return.findMany({
          where: buildLedgerReturnWhere(itemId, filters),
          include: {
            returnedByUser: {
              select: { firstName: true, lastName: true },
            },
            company: true,
            contractor: true,
            machine: true,
            location: true,
          } as any,
          orderBy: { returnedAt: "asc" },
        }),
      ]);

      let rows = buildLedgerRows(
        itemId,
        issues as Parameters<typeof buildLedgerRows>[1],
        standaloneReturns as unknown as Parameters<typeof buildLedgerRows>[2]
      );

      if (filters.conditions?.length) {
        rows = rows.filter((r) => r.condition && filters.conditions.includes(r.condition));
      }

      if (filters.search?.trim()) {
        const term = filters.search.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.issueNo.toLowerCase().includes(term) ||
            r.description.toLowerCase().includes(term) ||
            (r.company && r.company.toLowerCase().includes(term)) ||
            (r.contractor && r.contractor.toLowerCase().includes(term)) ||
            (r.machine && r.machine.toLowerCase().includes(term)) ||
            (r.location && r.location.toLowerCase().includes(term)) ||
            (r.user && r.user.toLowerCase().includes(term)) ||
            (r.remarks && r.remarks.toLowerCase().includes(term)) ||
            (r.returnCode && r.returnCode.toLowerCase().includes(term)) ||
            (r.condition && r.condition.toLowerCase().includes(term)) ||
            (r.inwardNo && r.inwardNo.toLowerCase().includes(term))
        );
      }
      rows = filterLedgerRowsByDate(rows, filters.dateFrom, filters.dateTo);
      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const flatRows: Record<string, unknown>[] = rows.map((r, idx) => ({
        "Sr.No": idx + 1,
        "Serial No": item.serialNumber ?? "N/A",
        "Item Name": item.itemName,
        Date: new Date(r.date).toLocaleString(),
        Event: r.type === "issue" ? "Issued" : "Returned",
        "Issue No": r.issueNo,
        Company: r.company ?? "N/A",
        Contractor: r.contractor ?? "N/A",
        Machine: r.machine ?? "N/A",
        Location: r.location ?? "N/A",
        Description: r.description,
        By: r.user ?? "N/A",
        Condition: r.condition ?? "N/A",
        "Inward No": r.inwardNo ?? "N/A",
        "Return Code": r.returnCode ?? "N/A",
        Remarks: r.remarks ?? "N/A",
      }));

      const categoryLabel = (item as { category?: { name: string } | null }).category?.name;
      const titleRow = categoryLabel
        ? `Ledger for: ${categoryLabel} » ${item.itemName} (Serial: ${item.serialNumber ?? "N/A"})`
        : `Ledger for: ${item.itemName} (Serial: ${item.serialNumber ?? "N/A"})`;
      const buffer = await buildFormattedExcelBuffer(flatRows, "Ledger", {
        titleRow,
      });
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
    const buffer = await buildFormattedExcelBuffer(historyRows, "Item History");
    const filename = `item-history-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", getExcelMime());
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

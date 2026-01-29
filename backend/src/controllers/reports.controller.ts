import { Request, Response, NextFunction } from "express";
import { prisma } from "../external-libraries/dbClient";
import { ItemStatus } from "@prisma/client";
import { NotFoundError } from "../utils/errors";

const convertToCSV = (
  data: Record<string, unknown>[],
  headers: string[],
  fields: string[]
): string => {
  const rows = [headers.join(",")];
  for (const row of data) {
    const values = fields.map((f) => {
      const v = f.split(".").reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], row);
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    });
    rows.push(values.join(","));
  }
  return rows.join("\n");
};

export const getIssuedItemsReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;
    const where: { isReturned: boolean; issuedAt?: { gte: Date; lte: Date } } = {
      isReturned: false,
    };
    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
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
    res.json({ success: true, data: issues });
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
    const items = await prisma.item.findMany({
      where: { status: ItemStatus.MISSING },
      include: { issues: true },
      orderBy: { itemName: "asc" },
    });
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

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
    res.json({
      success: true,
      data: { item, history: issues.map((i) => ({ issue: i, returns: i.returns })) },
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
    const { startDate, endDate } = req.query;
    const where: { isReturned: boolean; issuedAt?: { gte: Date; lte: Date } } = {
      isReturned: false,
    };
    if (startDate && endDate) {
      where.issuedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
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
    const headers = [
      "Issue No",
      "Item Code",
      "Item Name",
      "Issued To",
      "Issued By",
      "Status",
      "Issued Date",
      "Remarks",
    ];
    const csvData = issues.map((issue) => ({
      issueNo: issue.issueNo,
      itemCode: issue.item?.itemCode ?? "N/A",
      itemName: issue.item?.itemName ?? "N/A",
      issuedTo: issue.issuedTo ?? "N/A",
      issuedBy: issue.issuedByUser
        ? `${issue.issuedByUser.firstName} ${issue.issuedByUser.lastName}`
        : "N/A",
      status: issue.isReturned ? "Returned" : "Active",
      issuedDate: new Date(issue.issuedAt).toLocaleString(),
      remarks: issue.remarks ?? "N/A",
    }));
    const fields = [
      "issueNo",
      "itemCode",
      "itemName",
      "issuedTo",
      "issuedBy",
      "status",
      "issuedDate",
      "remarks",
    ];
    const csv = convertToCSV(csvData, headers, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="issued-items-report-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
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
    const items = await prisma.item.findMany({
      where: { status: ItemStatus.MISSING },
      include: { issues: true },
      orderBy: { itemName: "asc" },
    });
    const headers = [
      "Item Code",
      "Item Name",
      "Description",
      "Status",
      "Total Issues",
      "Created At",
      "Last Updated",
    ];
    const csvData = items.map((item) => ({
      itemCode: item.itemCode,
      itemName: item.itemName,
      description: item.description ?? "N/A",
      status: item.status,
      totalIssues: item.issues?.length ?? 0,
      createdAt: new Date(item.createdAt).toLocaleString(),
      updatedAt: new Date(item.updatedAt).toLocaleString(),
    }));
    const fields = [
      "itemCode",
      "itemName",
      "description",
      "status",
      "totalIssues",
      "createdAt",
      "updatedAt",
    ];
    const csv = convertToCSV(csvData, headers, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="missing-items-report-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
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
    const items = await prisma.item.findMany({
      include: {
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
    const historyRows: Record<string, unknown>[] = [];
    for (const item of items) {
      if (item.issues.length === 0) {
        historyRows.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          issueNo: "N/A",
          issuedBy: "N/A",
          issuedTo: "N/A",
          issuedDate: "N/A",
          returnedDate: "N/A",
          returnedBy: "N/A",
          status: item.status,
        });
      } else {
        for (const issue of item.issues) {
          if (issue.returns.length > 0) {
            for (const r of issue.returns) {
              historyRows.push({
                itemCode: item.itemCode,
                itemName: item.itemName,
                issueNo: issue.issueNo,
                issuedBy: `${issue.issuedByUser?.firstName ?? ""} ${issue.issuedByUser?.lastName ?? ""}`.trim() || "N/A",
                issuedTo: issue.issuedTo ?? "N/A",
                issuedDate: issue.issuedAt,
                returnedDate: r.returnedAt,
                returnedBy: `${r.returnedByUser?.firstName ?? ""} ${r.returnedByUser?.lastName ?? ""}`.trim() || "N/A",
                status: issue.isReturned ? "Returned" : "Active",
              });
            }
          } else {
            historyRows.push({
              itemCode: item.itemCode,
              itemName: item.itemName,
              issueNo: issue.issueNo,
              issuedBy: `${issue.issuedByUser?.firstName ?? ""} ${issue.issuedByUser?.lastName ?? ""}`.trim() || "N/A",
              issuedTo: issue.issuedTo ?? "N/A",
              issuedDate: issue.issuedAt,
              returnedDate: "N/A",
              returnedBy: "N/A",
              status: issue.isReturned ? "Returned" : "Active",
            });
          }
        }
      }
    }
    const headers = [
      "Item Code",
      "Item Name",
      "Issue No",
      "Issued By",
      "Issued To",
      "Issued Date",
      "Returned Date",
      "Returned By",
      "Status",
    ];
    const fields = [
      "itemCode",
      "itemName",
      "issueNo",
      "issuedBy",
      "issuedTo",
      "issuedDate",
      "returnedDate",
      "returnedBy",
      "status",
    ];
    const csv = convertToCSV(historyRows, headers, fields);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="item-history-report-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
};

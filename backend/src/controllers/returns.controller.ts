import { Request, Response, NextFunction } from "express";
import Return from "../entities/return";
import Issue from "../entities/issue";
import Item from "../entities/item";
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { ItemStatus } from "@prisma/client";
import { generateNextCode } from "../utils/codeGenerator";
import {
  parseTransactionFiltersFromQuery,
  hasActiveFilters,
} from "../types/filter";
import { getInwardImagePath } from "../utils/storagePath";

export const createReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { issueId, remarks, statusId } = req.body;
    const returnedBy = req.user!.id;
    const file = req.file;

    const parsedIssueId = Number(issueId);
    if (issueId == null || issueId === "" || Number.isNaN(parsedIssueId) || parsedIssueId < 1) {
      return next(new ValidationError("Issue ID is required"));
    }
    if (!file) {
      return next(new ValidationError("Return image is required"));
    }
    if (statusId == null || statusId === "") {
      return next(new ValidationError("Status is required"));
    }

    const issue = await Issue.findById(parsedIssueId);
    if (!issue) {
      return next(new NotFoundError("Issue not found"));
    }
    if (issue.isReturned) {
      return next(new BadRequestError("This issue has already been returned"));
    }

    const itemSerial =
      (issue as { item?: { serialNumber?: string | null } }).item?.serialNumber ??
      "";
    const imagePath = getInwardImagePath(itemSerial, file.filename);
    const returnCount = await Return.getCount();
    const returnCode = generateNextCode("INWARD", returnCount);

    const parsedStatusId = Number(statusId);
    if (Number.isNaN(parsedStatusId)) {
      return next(new ValidationError("Invalid status"));
    }

    const return_ = await Return.create({
      returnCode,
      issueId: parsedIssueId,
      returnedBy,
      returnImage: imagePath,
      remarks: remarks || undefined,
      statusId: parsedStatusId,
    });

    await Issue.markAsReturned(parsedIssueId);
    await Item.update(issue.itemId, { status: ItemStatus.AVAILABLE });

    res.status(201).json({ success: true, data: return_ });
  } catch (e) {
    next(e);
  }
};

export const getAllReturns = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const returns = hasActiveFilters(filters)
      ? await Return.findAllFiltered(filters)
      : await Return.findAll();
    res.json({ success: true, data: returns });
  } catch (e) {
    next(e);
  }
};

export const getReturnById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid return id"));
    }
    const return_ = await Return.findById(id);
    if (!return_) {
      return next(new NotFoundError(`Return with ID ${id} not found`));
    }
    res.json({ success: true, data: return_ });
  } catch (e) {
    next(e);
  }
};

export const getReturnsByIssueId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const issueId = parseInt(req.params.issueId);
    if (Number.isNaN(issueId)) {
      return next(new ValidationError("Invalid issue id"));
    }
    const returns = await Return.findByIssueId(issueId);
    res.json({ success: true, data: returns });
  } catch (e) {
    next(e);
  }
};

export const getNextInwardCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await Return.getCount();
    const nextCode = generateNextCode("INWARD", count);
    res.json({ success: true, data: { nextCode } });
  } catch (e) {
    next(e);
  }
};

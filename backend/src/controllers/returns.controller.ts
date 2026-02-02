import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import Return, { type ReturnCondition } from "../entities/return";
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
import { getInwardImagePath, sanitizeSerialForPath } from "../utils/storagePath";
import { prisma } from "../external-libraries/dbClient";

const storageRoot = path.resolve(process.cwd(), "storage");

const VALID_CONDITIONS: ReturnCondition[] = [
  "OK",
  "Damaged",
  "Calibration Required",
  "Missing",
];

function conditionToItemStatus(condition: string): ItemStatus {
  return condition === "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
}

export const createReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      issueId,
      itemId,
      condition,
      remarks,
      receivedBy,
      statusId,
      companyId,
      contractorId,
      machineId,
      locationId,
    } = req.body;
    const returnedBy = req.user!.id;
    const file = req.file;

    const cond = condition != null ? String(condition).trim() : "";
    if (!VALID_CONDITIONS.includes(cond as ReturnCondition)) {
      return next(
        new ValidationError(
          "Condition is required and must be one of: OK, Damaged, Calibration Required, Missing"
        )
      );
    }

    const hasIssue = issueId != null && issueId !== "";
    const hasMissingItem = itemId != null && itemId !== "";
    if (hasIssue && hasMissingItem) {
      return next(
        new ValidationError(
          "Choose either Outward (Issue) or Missing item, not both"
        )
      );
    }
    if (!hasIssue && !hasMissingItem) {
      return next(
        new ValidationError("Either Issue No (Outward) or Missing item is required")
      );
    }

    const returnCount = await Return.getCount();
    const returnCode = generateNextCode("INWARD", returnCount);

    let parsedStatusId: number | null = null;
    if (statusId != null && statusId !== "") {
      const n = Number(statusId);
      if (!Number.isNaN(n) && n >= 1) parsedStatusId = n;
    }

    if (hasIssue) {
      const parsedIssueId = Number(issueId);
      if (Number.isNaN(parsedIssueId) || parsedIssueId < 1) {
        return next(new ValidationError("Valid Issue ID is required"));
      }
      const imageRequired = cond !== "Missing";
      if (imageRequired && !file) {
        return next(new ValidationError("Return image is required for this condition"));
      }

      const issue = await Issue.findById(parsedIssueId);
      if (!issue) {
        return next(new NotFoundError("Issue not found"));
      }
      if (issue.isReturned) {
        return next(new BadRequestError("This issue has already been returned"));
      }

      let imagePath: string | null = null;
      if (file) {
        const itemSerial =
          (issue as { item?: { serialNumber?: string | null } }).item?.serialNumber ??
          "";
        const safeSerial = sanitizeSerialForPath(itemSerial);
        const ext = path.extname(file.originalname) || ".jpg";
        const filename = `inward-issue-${parsedIssueId}-${Date.now()}${ext}`;
        const inwardDir = path.join(storageRoot, "items", safeSerial, "inward");
        fs.mkdirSync(inwardDir, { recursive: true });
        fs.writeFileSync(path.join(inwardDir, filename), file.buffer);
        imagePath = getInwardImagePath(itemSerial, filename);
      }

      const return_ = await Return.create({
        returnCode,
        condition: cond as ReturnCondition,
        issueId: parsedIssueId,
        itemId: null,
        returnedBy,
        returnImage: imagePath ?? undefined,
        remarks: remarks || undefined,
        receivedBy: receivedBy ? String(receivedBy).trim() || undefined : undefined,
        statusId: parsedStatusId ?? undefined,
      });

      await Issue.markAsReturned(parsedIssueId);
      await Item.update(issue.itemId, {
        status: conditionToItemStatus(cond),
      });

      res.status(201).json({ success: true, data: return_ });
      return;
    }

    // Receive missing item (itemId only)
    const parsedItemId = Number(itemId);
    if (Number.isNaN(parsedItemId) || parsedItemId < 1) {
      return next(new ValidationError("Valid Missing item is required"));
    }

    const item = await Item.findById(parsedItemId);
    if (!item) {
      return next(new NotFoundError("Item not found"));
    }
    if (item.status !== ItemStatus.MISSING) {
      return next(
        new BadRequestError("Selected item is not in Missing status. Use Outward return for issued items.")
      );
    }

    let imagePath: string | null = null;
    if (file) {
      const itemSerial = item.serialNumber ?? "";
      const safeSerial = sanitizeSerialForPath(itemSerial);
      const ext = path.extname(file.originalname) || ".jpg";
      const filename = `inward-missing-${parsedItemId}-${Date.now()}${ext}`;
      const inwardDir = path.join(storageRoot, "items", safeSerial, "inward");
      fs.mkdirSync(inwardDir, { recursive: true });
      fs.writeFileSync(path.join(inwardDir, filename), file.buffer);
      imagePath = getInwardImagePath(itemSerial, filename);
    }

    let parsedCompanyId: number | null = null;
    let parsedContractorId: number | null = null;
    let parsedMachineId: number | null = null;
    let parsedLocationId: number | null = null;
    if (companyId != null && companyId !== "") {
      const n = Number(companyId);
      if (!Number.isNaN(n) && n >= 1) parsedCompanyId = n;
    }
    if (contractorId != null && contractorId !== "") {
      const n = Number(contractorId);
      if (!Number.isNaN(n) && n >= 1) parsedContractorId = n;
    }
    if (machineId != null && machineId !== "") {
      const n = Number(machineId);
      if (!Number.isNaN(n) && n >= 1) parsedMachineId = n;
    }
    if (locationId != null && locationId !== "") {
      const n = Number(locationId);
      if (!Number.isNaN(n) && n >= 1) parsedLocationId = n;
    }

    const return_ = await Return.create({
      returnCode,
      condition: cond as ReturnCondition,
      issueId: null,
      itemId: parsedItemId,
      returnedBy,
      returnImage: imagePath ?? undefined,
      remarks: remarks || undefined,
      receivedBy: receivedBy ? String(receivedBy).trim() || undefined : undefined,
      statusId: parsedStatusId ?? undefined,
      companyId: parsedCompanyId ?? undefined,
      contractorId: parsedContractorId ?? undefined,
      machineId: parsedMachineId ?? undefined,
      locationId: parsedLocationId ?? undefined,
    });

    await Item.update(parsedItemId, {
      status: conditionToItemStatus(cond),
    });

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
    const returnsList = hasActiveFilters(filters)
      ? await Return.findAllFiltered(filters)
      : await Return.findAll();
    const missingItemIds = [
      ...new Set(
        returnsList
          .filter((r: { itemId: number | null; issueId: number | null }) => r.itemId != null && r.issueId == null)
          .map((r: { itemId: number | null }) => r.itemId as number)
      ),
    ];
    let sourceByItemId: Record<number, string | null> = {};
    if (missingItemIds.length > 0) {
      const sourceReturns = await prisma.return.findMany({
        where: {
          itemId: { in: missingItemIds },
          condition: "Missing",
        },
        orderBy: { returnedAt: "desc" },
        select: { itemId: true, returnCode: true },
      });
      for (const r of sourceReturns) {
        if (r.itemId != null && sourceByItemId[r.itemId] == null) {
          sourceByItemId[r.itemId] = r.returnCode;
        }
      }
    }
    const data = returnsList.map((r: { itemId: number | null; issueId: number | null;[key: string]: unknown }) => {
      if (r.itemId != null && r.issueId == null) {
        return { ...r, sourceInwardCode: sourceByItemId[r.itemId] ?? null };
      }
      return r;
    });
    res.json({ success: true, data });
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

export const updateReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid return id"));
    }
    const { remarks, receivedBy, statusId, condition, companyId, contractorId, machineId, locationId } = req.body;
    const updateData: {
      remarks?: string;
      receivedBy?: string;
      statusId?: number | null;
      condition?: string;
      companyId?: number | null;
      contractorId?: number | null;
      machineId?: number | null;
      locationId?: number | null;
    } = {};
    if (remarks !== undefined) updateData.remarks = remarks;
    if (receivedBy !== undefined)
      updateData.receivedBy =
        receivedBy ? String(receivedBy).trim() || undefined : undefined;
    if (statusId !== undefined) {
      if (statusId === null || statusId === "") {
        updateData.statusId = null;
      } else {
        const parsedStatusId = Number(statusId);
        if (Number.isNaN(parsedStatusId) || parsedStatusId < 1) {
          return next(new ValidationError("Valid status is required"));
        }
        updateData.statusId = parsedStatusId;
      }
    }
    const newCondition =
      condition !== undefined && VALID_CONDITIONS.includes(String(condition).trim() as ReturnCondition)
        ? String(condition).trim()
        : undefined;
    if (newCondition) updateData.condition = newCondition;
    if (companyId !== undefined) updateData.companyId = companyId == null || companyId === "" ? null : Number(companyId);
    if (contractorId !== undefined) updateData.contractorId = contractorId == null || contractorId === "" ? null : Number(contractorId);
    if (machineId !== undefined) updateData.machineId = machineId == null || machineId === "" ? null : Number(machineId);
    if (locationId !== undefined) updateData.locationId = locationId == null || locationId === "" ? null : Number(locationId);

    const existing = await Return.findById(id);
    if (!existing) {
      return next(new NotFoundError(`Return with ID ${id} not found`));
    }

    const return_ = await Return.update(id, updateData);

    if (newCondition) {
      let itemIdToUpdate: number | null = null;
      const existingWithRelations = existing as {
        issueId?: number | null;
        itemId?: number | null;
        issue?: { itemId: number };
      };
      if (existingWithRelations.issueId != null && existingWithRelations.issue) {
        itemIdToUpdate = existingWithRelations.issue.itemId;
      } else if (existingWithRelations.itemId != null) {
        itemIdToUpdate = existingWithRelations.itemId;
      }
      if (itemIdToUpdate != null) {
        await Item.update(itemIdToUpdate, {
          status: conditionToItemStatus(newCondition),
        });
      }
    }

    res.json({ success: true, data: return_ });
  } catch (e) {
    next(e);
  }
};

export const setReturnActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid return id"));
    }
    if (req.user!.role !== "QC_ADMIN") {
      return next(
        new ValidationError("Only Admin is allowed to perform this action")
      );
    }

    const existing = await Return.findById(id);
    if (!existing) {
      return next(new NotFoundError(`Return with ID ${id} not found`));
    }

    // Guard: Requirement 2 - If this return is from an issue, check if the issue is already returned
    if (existing.issueId != null) {
      const issue = await Issue.findById(existing.issueId);
      if (issue && issue.isReturned) {
        return next(
          new BadRequestError(
            "Cannot reactivate this inward. A newer inward already exists for this outward (issue). Please inactivate the current active inward first if you wish to change it."
          )
        );
      }
    }

    const return_ = await Return.setActive(id);

    // Requirement 1: Synchronize status (when activating)
    if (existing.issueId != null) {
      await Issue.markAsReturned(existing.issueId);
      const issue = await Issue.findById(existing.issueId);
      if (issue) {
        await Item.update(issue.itemId, {
          status: conditionToItemStatus(existing.condition),
        });
      }
    } else if (existing.itemId != null) {
      await Item.update(existing.itemId, {
        status: conditionToItemStatus(existing.condition),
      });
    }

    res.json({ success: true, data: return_ });
  } catch (e) {
    next(e);
  }
};

export const setReturnInactive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid return id"));
    }
    if (req.user!.role !== "QC_ADMIN") {
      return next(
        new ValidationError("Only Admin is allowed to perform this action")
      );
    }

    const existing = await Return.findById(id);
    if (!existing) {
      return next(new NotFoundError(`Return with ID ${id} not found`));
    }

    const return_ = await Return.setInactive(id);

    // Requirement 1: Synchronize status (when inactivating)
    if (existing.issueId != null) {
      // Re-open the issue
      await Issue.unmarkAsReturned(existing.issueId);

      const issue = await Issue.findById(existing.issueId);
      if (issue) {
        // Mark item as ISSUED again because the inward is now gone
        await Item.update(issue.itemId, {
          status: ItemStatus.ISSUED,
        });
      }
    } else if (existing.itemId != null) {
      // If it was inward from missing, set it back to MISSING status if the inward is deactivated
      await Item.update(existing.itemId, {
        status: ItemStatus.MISSING,
      });
    }

    res.json({ success: true, data: return_ });
  } catch (e) {
    next(e);
  }
};

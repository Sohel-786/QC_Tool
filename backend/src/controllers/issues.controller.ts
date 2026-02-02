import { Request, Response, NextFunction } from "express";
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

export const createIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      itemId,
      issuedTo,
      remarks,
      categoryId,
      companyId,
      contractorId,
      machineId,
      locationId,
    } = req.body;
    const issuedBy = req.user!.id;

    const parsedItemId = Number(itemId);
    if (itemId == null || itemId === "" || Number.isNaN(parsedItemId) || parsedItemId < 1) {
      return next(new ValidationError("Item is required"));
    }
    if (companyId == null || companyId === "") {
      return next(new ValidationError("Company is required"));
    }
    if (contractorId == null || contractorId === "") {
      return next(new ValidationError("Contractor is required"));
    }
    if (machineId == null || machineId === "") {
      return next(new ValidationError("Machine is required"));
    }
    if (locationId == null || locationId === "") {
      return next(new ValidationError("Location is required"));
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return next(new NotFoundError("Item not found"));
    }
    if (item.status !== ItemStatus.AVAILABLE) {
      return next(new BadRequestError("Item is not available for issue"));
    }

    if (
      categoryId !== undefined &&
      categoryId !== null &&
      categoryId !== ""
    ) {
      const parsedCategoryId = Number(categoryId);
      if (Number.isNaN(parsedCategoryId)) {
        return next(new ValidationError("Invalid item category"));
      }
      if (
        !item.categoryId ||
        item.categoryId !== parsedCategoryId
      ) {
        return next(
          new BadRequestError(
            "Selected item does not belong to the chosen category. Please select a matching item."
          )
        );
      }
    }

    const issueNo = await Issue.generateIssueNo();

    const parsedCompanyId = Number(companyId);
    const parsedContractorId = Number(contractorId);
    const parsedMachineId = Number(machineId);
    const parsedLocationId = Number(locationId);
    if (Number.isNaN(parsedCompanyId)) {
      return next(new ValidationError("Invalid company"));
    }
    if (Number.isNaN(parsedContractorId)) {
      return next(new ValidationError("Invalid contractor"));
    }
    if (Number.isNaN(parsedMachineId)) {
      return next(new ValidationError("Invalid machine"));
    }
    if (Number.isNaN(parsedLocationId) || parsedLocationId < 1) {
      return next(new ValidationError("Invalid location"));
    }

    const issue = await Issue.create({
      issueNo,
      itemId: parsedItemId,
      issuedBy,
      issuedTo: issuedTo || undefined,
      remarks: remarks || undefined,
      companyId: parsedCompanyId,
      contractorId: parsedContractorId,
      machineId: parsedMachineId,
      locationId: parsedLocationId,
    });

    await Item.update(itemId, { status: ItemStatus.ISSUED });

    res.status(201).json({ success: true, data: issue });
  } catch (e) {
    next(e);
  }
};

export const getAllIssues = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = parseTransactionFiltersFromQuery(req.query as Record<string, string>);
    const issues = hasActiveFilters(filters)
      ? await Issue.findAllFiltered(filters)
      : await Issue.findAll();
    res.json({ success: true, data: issues });
  } catch (e) {
    next(e);
  }
};

export const getActiveIssues = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const issues = await Issue.findActive();
    res.json({ success: true, data: issues });
  } catch (e) {
    next(e);
  }
};

export const getIssueById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid issue id"));
    }
    const issue = await Issue.findById(id);
    if (!issue) {
      return next(new NotFoundError(`Issue with ID ${id} not found`));
    }
    res.json({ success: true, data: issue });
  } catch (e) {
    next(e);
  }
};

export const getIssueByIssueNo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { issueNo } = req.params;
    const issue = await Issue.findByIssueNo(issueNo);
    if (!issue) {
      return next(
        new NotFoundError(`Issue with number ${issueNo} not found`)
      );
    }
    res.json({ success: true, data: issue });
  } catch (e) {
    next(e);
  }
};

export const getNextIssueCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const count = await Issue.getCount();
    const nextCode = generateNextCode("OUTWARD", count);
    res.json({ success: true, data: { nextCode } });
  } catch (e) {
    next(e);
  }
};

export const updateIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid issue id"));
    }
    const issue = await Issue.findById(id);
    if (!issue) {
      return next(new NotFoundError(`Issue with ID ${id} not found`));
    }
    if (issue.isReturned) {
      return next(
        new BadRequestError("Cannot edit outward once inward is done.")
      );
    }

    const { issuedTo, remarks, companyId, contractorId, machineId, locationId } = req.body;

    const updateData: Record<string, unknown> = {};
    if (issuedTo !== undefined) updateData.issuedTo = issuedTo || null;
    if (remarks !== undefined) updateData.remarks = remarks || null;
    if (companyId !== undefined) {
      if (companyId === "" || companyId == null) {
        return next(new ValidationError("Company is required"));
      }
      const n = Number(companyId);
      if (Number.isNaN(n)) {
        return next(new ValidationError("Invalid company"));
      }
      updateData.companyId = n;
    }
    if (contractorId !== undefined) {
      if (contractorId === "" || contractorId == null) {
        return next(new ValidationError("Contractor is required"));
      }
      const n = Number(contractorId);
      if (Number.isNaN(n)) {
        return next(new ValidationError("Invalid contractor"));
      }
      updateData.contractorId = n;
    }
    if (machineId !== undefined) {
      if (machineId === "" || machineId == null) {
        return next(new ValidationError("Machine is required"));
      }
      const n = Number(machineId);
      if (Number.isNaN(n)) {
        return next(new ValidationError("Invalid machine"));
      }
      updateData.machineId = n;
    }
    if (locationId !== undefined) {
      if (locationId === "" || locationId == null) {
        return next(new ValidationError("Location is required"));
      }
      const n = Number(locationId);
      if (Number.isNaN(n) || n < 1) {
        return next(new ValidationError("Invalid location"));
      }
      updateData.locationId = n;
    }

    const updated = await Issue.update(id, updateData);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const setIssueInactive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid issue id"));
    }
    if (req.user!.role !== "QC_ADMIN") {
      return next(
        new ValidationError("Only Admin is allowed to perform this action")
      );
    }
    const issue = await Issue.findById(id);
    if (!issue) {
      return next(new NotFoundError(`Issue with ID ${id} not found`));
    }
    if (issue.isReturned) {
      return next(
        new BadRequestError(
          "Cannot mark outward inactive once inward is done."
        )
      );
    }

    const updated = await Issue.update(id, { isActive: false });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const setIssueActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return next(new ValidationError("Invalid issue id"));
    }
    if (req.user!.role !== "QC_ADMIN") {
      return next(
        new ValidationError("Only Admin is allowed to perform this action")
      );
    }
    const issue = await Issue.findById(id);
    if (!issue) {
      return next(new NotFoundError(`Issue with ID ${id} not found`));
    }

    const updated = await Issue.update(id, { isActive: true });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

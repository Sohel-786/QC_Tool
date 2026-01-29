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
    } = req.body;
    const issuedBy = req.user!.id;

    if (!itemId) {
      return next(new ValidationError("Item is required"));
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

    let parsedCompanyId: number | undefined;
    if (companyId != null && companyId !== "") {
      const n = Number(companyId);
      if (!Number.isNaN(n)) parsedCompanyId = n;
    }
    let parsedContractorId: number | undefined;
    if (contractorId != null && contractorId !== "") {
      const n = Number(contractorId);
      if (!Number.isNaN(n)) parsedContractorId = n;
    }
    let parsedMachineId: number | undefined;
    if (machineId != null && machineId !== "") {
      const n = Number(machineId);
      if (!Number.isNaN(n)) parsedMachineId = n;
    }

    const issue = await Issue.create({
      issueNo,
      itemId,
      issuedBy,
      issuedTo: issuedTo || undefined,
      remarks: remarks || undefined,
      companyId: parsedCompanyId,
      contractorId: parsedContractorId,
      machineId: parsedMachineId,
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
    const issues = await Issue.findAll();
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

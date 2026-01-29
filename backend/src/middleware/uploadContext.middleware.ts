import { Request, Response, NextFunction } from "express";
import Item from "../entities/item";
import Issue from "../entities/issue";
import { NotFoundError, BadRequestError } from "../utils/errors";

/**
 * Extend Express Request with upload context set by middlewares before multer.
 */
export type RequestWithUploadContext = Request & {
  itemSerialNumberForUpload?: string;
};

/**
 * For PATCH /items/:id - load item and set serial number so multer can save to items/{serial}/master.ext
 */
export async function attachItemSerialForUpload(
  req: RequestWithUploadContext,
  res: Response,
  next: NextFunction
) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return next();
    }
    const item = await Item.findById(id);
    if (!item) {
      return next(new NotFoundError(`Item with ID ${id} not found`));
    }
    req.itemSerialNumberForUpload = item.serialNumber ?? "";
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * For POST /returns - load issue and item, set serial so multer can save to items/{serial}/inward/
 */
export async function attachIssueAndItemForReturn(
  req: RequestWithUploadContext,
  res: Response,
  next: NextFunction
) {
  try {
    const issueId = req.body?.issueId;
    if (issueId == null || issueId === "") {
      return next();
    }
    const id = Number(issueId);
    if (Number.isNaN(id)) {
      return next();
    }
    const issue = await Issue.findById(id);
    if (!issue) {
      return next(new NotFoundError("Issue not found"));
    }
    if (issue.isReturned) {
      return next(new BadRequestError("This issue has already been returned"));
    }
    const serial = (issue as { item?: { serialNumber?: string | null } }).item?.serialNumber;
    req.itemSerialNumberForUpload = serial ?? "";
    next();
  } catch (e) {
    next(e);
  }
}

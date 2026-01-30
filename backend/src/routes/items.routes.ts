import { Router } from "express";
import {
  createItem,
  getAllItems,
  getActiveItems,
  getAvailableItems,
  getMissingItems,
  getItemsByCategory,
  getItemById,
  updateItem,
  exportItems,
  importItems,
} from "../controllers/items.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadItemImage, uploadImportExcel } from "../middleware/multer.middleware";
import { attachItemSerialForUpload } from "../middleware/uploadContext.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllItems);
router.get("/active", requirePermission("viewMaster"), getActiveItems);
router.get("/available", requirePermission("viewMaster"), getAvailableItems);
router.get("/missing", requirePermission("viewInward"), getMissingItems);
router.get("/by-category/:categoryId", requirePermission("viewMaster"), getItemsByCategory);
router.get("/export", requirePermission("importExportMaster"), exportItems);
router.get("/:id", requirePermission("viewMaster"), getItemById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importItems
);

router.post(
  "/",
  requirePermission("addMaster"),
  uploadItemImage.single("image"),
  validateMiddleware([
    body("itemName").notEmpty().withMessage("Item name is required"),
    body("serialNumber").notEmpty().withMessage("Serial number is required"),
  ]),
  createItem
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  attachItemSerialForUpload,
  uploadItemImage.single("image"),
  updateItem
);

export default router;

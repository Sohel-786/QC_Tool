import { Router } from "express";
import {
  createItemCategory,
  getAllItemCategories,
  getActiveItemCategories,
  getItemCategoryById,
  updateItemCategory,
  exportItemCategories,
  importItemCategories,
} from "../controllers/itemCategories.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllItemCategories);
router.get("/active", requirePermission("viewMaster"), getActiveItemCategories);
router.get("/export", requirePermission("importExportMaster"), exportItemCategories);
router.get("/:id", requirePermission("viewMaster"), getItemCategoryById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importItemCategories
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name")
      .notEmpty()
      .withMessage("Item category name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Item category name must be 2–100 characters"),
  ]),
  createItemCategory
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateItemCategory
);

export default router;

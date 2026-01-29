import { Router } from "express";
import {
  createItem,
  getAllItems,
  getActiveItems,
  getAvailableItems,
  getItemsByCategory,
  getItemById,
  updateItem,
  exportItems,
  importItems,
} from "../controllers/items.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadItemImage, uploadImportExcel } from "../middleware/multer.middleware";
import { attachItemSerialForUpload } from "../middleware/uploadContext.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllItems);
router.get("/active", getActiveItems);
router.get("/available", getAvailableItems);
router.get("/by-category/:categoryId", getItemsByCategory);
router.get("/export", exportItems);
router.get("/:id", getItemById);

router.post(
  "/import",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadImportExcel.single("file"),
  importItems
);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadItemImage.single("image"),
  validateMiddleware([
    body("itemName").notEmpty().withMessage("Item name is required"),
    body("serialNumber").notEmpty().withMessage("Serial number is required"),
  ]),
  createItem
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  attachItemSerialForUpload,
  uploadItemImage.single("image"),
  updateItem
);

export default router;

import { Router } from "express";
import {
  createStatus,
  getAllStatuses,
  getActiveStatuses,
  getStatusById,
  updateStatus,
  exportStatuses,
  importStatuses,
} from "../controllers/statuses.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllStatuses);
router.get("/active", requirePermission("viewMaster"), getActiveStatuses);
router.get("/export", requirePermission("importExportMaster"), exportStatuses);
router.get("/:id", requirePermission("viewMaster"), getStatusById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importStatuses
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name").notEmpty().withMessage("Status name is required"),
  ]),
  createStatus
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateStatus
);

export default router;

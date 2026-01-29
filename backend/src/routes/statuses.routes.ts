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
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllStatuses);
router.get("/active", getActiveStatuses);
router.get("/export", exportStatuses);
router.get("/:id", getStatusById);

router.post(
  "/import",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadImportExcel.single("file"),
  importStatuses
);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name").notEmpty().withMessage("Status name is required"),
  ]),
  createStatus
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateStatus
);

export default router;

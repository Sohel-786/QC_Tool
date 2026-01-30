import { Router } from "express";
import {
  createContractor,
  getAllContractors,
  getActiveContractors,
  getContractorById,
  updateContractor,
  exportContractors,
  importContractors,
} from "../controllers/contractors.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllContractors);
router.get("/active", requirePermission("viewMaster"), getActiveContractors);
router.get("/export", requirePermission("importExportMaster"), exportContractors);
router.get("/:id", requirePermission("viewMaster"), getContractorById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importContractors
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name").notEmpty().withMessage("Contractor name is required"),
  ]),
  createContractor
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateContractor
);

export default router;

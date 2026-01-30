import { Router } from "express";
import {
  createCompany,
  getAllCompanies,
  getActiveCompanies,
  getCompanyById,
  updateCompany,
  exportCompanies,
  importCompanies,
} from "../controllers/companies.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllCompanies);
router.get("/active", requirePermission("viewMaster"), getActiveCompanies);
router.get("/export", requirePermission("importExportMaster"), exportCompanies);
router.get("/:id", requirePermission("viewMaster"), getCompanyById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importCompanies
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name").notEmpty().withMessage("Company name is required"),
  ]),
  createCompany
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateCompany
);

export default router;

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
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllContractors);
router.get("/active", getActiveContractors);
router.get("/export", exportContractors);
router.get("/:id", getContractorById);

router.post(
  "/import",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadImportExcel.single("file"),
  importContractors
);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name").notEmpty().withMessage("Contractor name is required"),
  ]),
  createContractor
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateContractor
);

export default router;

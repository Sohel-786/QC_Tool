import { Router } from "express";
import {
  createCompany,
  getAllCompanies,
  getActiveCompanies,
  getCompanyById,
  getNextCompanyCode,
  updateCompany,
} from "../controllers/companies.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllCompanies);
router.get("/active", getActiveCompanies);
router.get("/next-code", getNextCompanyCode);
router.get("/:id", getCompanyById);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name").notEmpty().withMessage("Company name is required"),
  ]),
  createCompany
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateCompany
);

export default router;

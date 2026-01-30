import { Router } from "express";
import {
  getSoftwareSettings,
  updateSoftwareSettings,
  uploadSoftwareLogo,
  getPermissions,
  getMyPermissions,
  updatePermissions,
} from "../controllers/settings.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { uploadSettingsLogo } from "../middleware/multer.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

// Software settings: GET is public (for branding on login/sidebar)
router.get("/software", getSoftwareSettings);

// Authenticated routes
router.use(authMiddleware());

// Any authenticated user can get their own role's permissions
router.get("/permissions/me", getMyPermissions);

// Routes that require accessSettings
router.use(requirePermission("accessSettings"));

router.patch(
  "/software",
  validateMiddleware([
    body("companyName").optional({ values: "falsy" }).trim().isLength({ max: 255 }),
    body("softwareName").optional({ values: "falsy" }).trim().isLength({ max: 255 }),
    body("primaryColor").optional({ values: "falsy" }).trim().isLength({ max: 20 }),
  ]),
  updateSoftwareSettings
);

router.post("/software/logo", uploadSettingsLogo.single("logo"), uploadSoftwareLogo);

router.get("/permissions", getPermissions);

router.patch(
  "/permissions",
  validateMiddleware([
    body("permissions").isArray(),
    body("permissions.*.role").isIn(["QC_USER", "QC_MANAGER", "QC_ADMIN"]),
  ]),
  updatePermissions
);

export default router;

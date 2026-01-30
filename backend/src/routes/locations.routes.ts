import { Router } from "express";
import {
  createLocation,
  getAllLocations,
  getActiveLocations,
  getLocationById,
  updateLocation,
  exportLocations,
  importLocations,
} from "../controllers/locations.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllLocations);
router.get("/active", requirePermission("viewMaster"), getActiveLocations);
router.get("/export", requirePermission("importExportMaster"), exportLocations);
router.get("/:id", requirePermission("viewMaster"), getLocationById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importLocations
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name").notEmpty().withMessage("Location name is required"),
  ]),
  createLocation
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateLocation
);

export default router;

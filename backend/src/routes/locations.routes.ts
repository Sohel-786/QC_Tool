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
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllLocations);
router.get("/active", getActiveLocations);
router.get("/export", exportLocations);
router.get("/:id", getLocationById);

router.post(
  "/import",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadImportExcel.single("file"),
  importLocations
);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name").notEmpty().withMessage("Location name is required"),
  ]),
  createLocation
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateLocation
);

export default router;

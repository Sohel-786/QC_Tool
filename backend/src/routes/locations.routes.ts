import { Router } from "express";
import {
  createLocation,
  getAllLocations,
  getActiveLocations,
  getLocationById,
  getNextLocationCode,
  updateLocation,
} from "../controllers/locations.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllLocations);
router.get("/active", getActiveLocations);
router.get("/next-code", getNextLocationCode);
router.get("/:id", getLocationById);

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

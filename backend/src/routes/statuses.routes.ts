import { Router } from "express";
import {
  createStatus,
  getAllStatuses,
  getActiveStatuses,
  getStatusById,
  getNextStatusCode,
  updateStatus,
} from "../controllers/statuses.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllStatuses);
router.get("/active", getActiveStatuses);
router.get("/next-code", getNextStatusCode);
router.get("/:id", getStatusById);

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

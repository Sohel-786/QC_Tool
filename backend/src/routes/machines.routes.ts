import { Router } from "express";
import {
  createMachine,
  getAllMachines,
  getActiveMachines,
  getMachineById,
  getNextMachineCode,
  updateMachine,
} from "../controllers/machines.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllMachines);
router.get("/active", getActiveMachines);
router.get("/next-code", getNextMachineCode);
router.get("/:id", getMachineById);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name").notEmpty().withMessage("Machine name is required"),
  ]),
  createMachine
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateMachine
);

export default router;

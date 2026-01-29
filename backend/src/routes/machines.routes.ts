import { Router } from "express";
import {
  createMachine,
  getAllMachines,
  getActiveMachines,
  getMachineById,
  updateMachine,
  exportMachines,
  importMachines,
} from "../controllers/machines.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllMachines);
router.get("/active", getActiveMachines);
router.get("/export", exportMachines);
router.get("/:id", getMachineById);

router.post(
  "/import",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  uploadImportExcel.single("file"),
  importMachines
);

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

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
import { requirePermission } from "../middleware/permission.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";
import { uploadImportExcel } from "../middleware/multer.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", requirePermission("viewMaster"), getAllMachines);
router.get("/active", requirePermission("viewMaster"), getActiveMachines);
router.get("/export", requirePermission("importExportMaster"), exportMachines);
router.get("/:id", requirePermission("viewMaster"), getMachineById);

router.post(
  "/import",
  requirePermission("importExportMaster"),
  uploadImportExcel.single("file"),
  importMachines
);

router.post(
  "/",
  requirePermission("addMaster"),
  validateMiddleware([
    body("name").notEmpty().withMessage("Machine name is required"),
  ]),
  createMachine
);

router.patch(
  "/:id",
  requirePermission("editMaster"),
  updateMachine
);

export default router;

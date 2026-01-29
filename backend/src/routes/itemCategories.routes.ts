import { Router } from "express";
import {
  createItemCategory,
  getAllItemCategories,
  getActiveItemCategories,
  getItemCategoryById,
  getNextItemCategoryCode,
  updateItemCategory,
} from "../controllers/itemCategories.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validate as validateMiddleware } from "../middleware/validation.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/", getAllItemCategories);
router.get("/active", getActiveItemCategories);
router.get("/next-code", getNextItemCategoryCode);
router.get("/:id", getItemCategoryById);

router.post(
  "/",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  validateMiddleware([
    body("name")
      .notEmpty()
      .withMessage("Item category name is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("Item category name must be 2–100 characters"),
  ]),
  createItemCategory
);

router.patch(
  "/:id",
  authMiddleware(["QC_USER", "QC_MANAGER"]),
  updateItemCategory
);

export default router;

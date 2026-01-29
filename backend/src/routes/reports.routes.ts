import { Router } from "express";
import {
  getIssuedItemsReport,
  getMissingItemsReport,
  getItemHistoryLedger,
  getAllItemsHistory,
  exportIssuedItemsReport,
  exportMissingItemsReport,
  exportItemHistoryReport,
} from "../controllers/reports.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/issued-items", getIssuedItemsReport);
router.get("/missing-items", getMissingItemsReport);
router.get("/item-history/:itemId", getItemHistoryLedger);
router.get("/item-history", getAllItemsHistory);

router.get("/export/issued-items", exportIssuedItemsReport);
router.get("/export/missing-items", exportMissingItemsReport);
router.get("/export/item-history", exportItemHistoryReport);

export default router;

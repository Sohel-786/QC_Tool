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
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware());

router.get("/issued-items", requirePermission("viewReports"), getIssuedItemsReport);
router.get("/missing-items", requirePermission("viewReports"), getMissingItemsReport);
router.get("/item-history/:itemId", requirePermission("viewReports"), getItemHistoryLedger);
router.get("/item-history", requirePermission("viewReports"), getAllItemsHistory);

router.get("/export/issued-items", requirePermission("viewReports"), exportIssuedItemsReport);
router.get("/export/missing-items", requirePermission("viewReports"), exportMissingItemsReport);
router.get("/export/item-history", requirePermission("viewReports"), exportItemHistoryReport);

export default router;

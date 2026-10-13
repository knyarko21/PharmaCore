
const express = require("express");

const {
  getInventorySummary,
  getLowStockMedicines,
  getExpiringBatches,
  getExpiredBatches,
  getStockByMedicine,
  adjustStock
} = require("../controllers/inventoryController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  adjustStockSchema
} = require("../validators/inventoryAdjustmentValidator");

const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const inventoryReadRoles = ["admin", "pharmacist", "inventory_manager"];

const inventoryAdjustRoles = ["admin", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET  /api/inventory/summary                 summary + totals
// GET  /api/inventory/low-stock               low-stock medicines
// GET  /api/inventory/expiring?days=90        expiring batches
// GET  /api/inventory/expired                 expired batches
// GET  /api/inventory/medicine/:medicineId    stock for a medicine
// POST /api/inventory/adjust                  manual stock adjustment
//
// NOTE: Static segments (/summary, /low-stock, ...) are declared
// before dynamic segments so they always match first.
// ======================================================

router.get(
  "/summary",
  authenticate,
  authorize(...inventoryReadRoles),
  getInventorySummary
);

router.get(
  "/low-stock",
  authenticate,
  authorize(...inventoryReadRoles),
  getLowStockMedicines
);

router.get(
  "/expiring",
  authenticate,
  authorize(...inventoryReadRoles),
  getExpiringBatches
);

router.get(
  "/expired",
  authenticate,
  authorize(...inventoryReadRoles),
  getExpiredBatches
);

router.get(
  "/medicine/:medicineId",
  authenticate,
  authorize(...inventoryReadRoles),
  getStockByMedicine
);

router.post(
  "/adjust",
  authenticate,
  authorize(...inventoryAdjustRoles),
  validate(adjustStockSchema),
  adjustStock
);

module.exports = router;
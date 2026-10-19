
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
// Role Permissions
// ======================================================

// All operational roles can view inventory information.
const inventoryReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

// Only authorized stock managers can manually adjust stock.
const inventoryAdjustRoles = [
  "admin",
  "inventory_manager"
];

// ======================================================
// Inventory Routes
// ======================================================

// GET /api/inventory/summary
router.get(
  "/summary",
  authenticate,
  authorize(...inventoryReadRoles),
  getInventorySummary
);

// GET /api/inventory/low-stock
router.get(
  "/low-stock",
  authenticate,
  authorize(...inventoryReadRoles),
  getLowStockMedicines
);

// GET /api/inventory/expiring?days=90
router.get(
  "/expiring",
  authenticate,
  authorize(...inventoryReadRoles),
  getExpiringBatches
);

// GET /api/inventory/expired
router.get(
  "/expired",
  authenticate,
  authorize(...inventoryReadRoles),
  getExpiredBatches
);

// GET /api/inventory/medicine/:medicineId
router.get(
  "/medicine/:medicineId",
  authenticate,
  authorize(...inventoryReadRoles),
  getStockByMedicine
);

// POST /api/inventory/adjust
router.post(
  "/adjust",
  authenticate,
  authorize(...inventoryAdjustRoles),
  validate(adjustStockSchema),
  adjustStock
);

module.exports = router;

const express = require("express");

const {
  getInventoryAlerts
} = require("../controllers/inventoryAlertController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/inventory-alerts/alerts  combined low/expiring/expired alerts
//
// NOTE: /alerts is a redundant segment given the mount
// point, but kept here to match the existing frontend
// calls. If you'd rather expose this at /api/inventory-alerts
// directly, remove the "/alerts" string below and update
// the frontend accordingly.
// ======================================================

router.get(
  "/alerts",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  getInventoryAlerts
);

module.exports = router;
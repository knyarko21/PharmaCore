
const express = require("express");

const {
  getSalesAnalytics,
  getSalesTrends,
  getTopSelling
} = require("../controllers/analyticsController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Role Permissions
// ======================================================

// All operational roles can view analytics.
// Review returned financial data before production use.
const analyticsRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

// ======================================================
// Analytics Routes
// ======================================================

// GET /api/analytics/sales
router.get(
  "/sales",
  authenticate,
  authorize(...analyticsRoles),
  getSalesAnalytics
);

// GET /api/analytics/trends
router.get(
  "/trends",
  authenticate,
  authorize(...analyticsRoles),
  getSalesTrends
);

// GET /api/analytics/top-selling
router.get(
  "/top-selling",
  authenticate,
  authorize(...analyticsRoles),
  getTopSelling
);

module.exports = router;
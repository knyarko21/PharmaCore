
const express = require("express");

const {
  getSalesAnalytics
} = require("../controllers/salesAnalyticsController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/sales-analytics/sales  today + month summary
//
// Prefer /api/analytics/sales. This file is kept only
// if you need a standalone mount point.
// ======================================================

router.get(
  "/sales",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  getSalesAnalytics
);

module.exports = router;

const express = require("express");

const {
  getSalesTrends
} = require("../controllers/salesTrendsController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/sales-trends/trends  30-day daily breakdown
//
// Prefer /api/analytics/trends. This file is kept only
// if you need a standalone mount point.
// ======================================================

router.get(
  "/trends",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  getSalesTrends
);

module.exports = router;
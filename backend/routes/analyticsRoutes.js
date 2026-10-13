
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
// Middleware shortcuts
// ======================================================

const analyticsRoles = ["admin", "pharmacist", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// All three endpoints are mounted under /api/analytics/*
// so the frontend Analytics.jsx page — which calls
// /api/analytics/sales, /api/analytics/trends and
// /api/analytics/top-selling — works without changes.
//
// GET /api/analytics/sales        today + month summary
// GET /api/analytics/trends       30-day daily breakdown
// GET /api/analytics/top-selling  top medicines (today + month)
// ======================================================

router.get(
  "/sales",
  authenticate,
  authorize(...analyticsRoles),
  getSalesAnalytics
);

router.get(
  "/trends",
  authenticate,
  authorize(...analyticsRoles),
  getSalesTrends
);

router.get(
  "/top-selling",
  authenticate,
  authorize(...analyticsRoles),
  getTopSelling
);

module.exports = router;
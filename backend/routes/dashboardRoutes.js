
const express = require("express");

const {
  getDashboardOverview
} = require("../controllers/dashboardController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/dashboard/overview  aggregated stats for the dashboard
// ======================================================

router.get(
  "/overview",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  getDashboardOverview
);

module.exports = router;
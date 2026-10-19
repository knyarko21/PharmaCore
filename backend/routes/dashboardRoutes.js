
const express = require("express");

const {
  getDashboardOverview
} = require("../controllers/dashboardController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Dashboard Routes
// ======================================================

// GET /api/dashboard/overview
// All operational roles can view the dashboard overview.

router.get(
  "/overview",
  authenticate,
  authorize(
    "admin",
    "pharmacist",
    "cashier",
    "inventory_manager"
  ),
  getDashboardOverview
);

module.exports = router;
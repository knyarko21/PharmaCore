
const express = require("express");

const {
  getTopSellingMedicines
} = require("../controllers/topSellingController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/top-selling/top-selling  top medicines (today + month)
//
// Prefer /api/analytics/top-selling. This file is kept
// only if you need a standalone mount point.
// ======================================================

router.get(
  "/top-selling",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  getTopSellingMedicines
);

module.exports = router;
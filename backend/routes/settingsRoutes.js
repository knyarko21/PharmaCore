
const express = require("express");

const {
  getSettings,
  updateSettings
} = require("../controllers/settingsController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/settings  load the current user's settings
// PUT /api/settings  update the current user's settings
//
// NOTE: /me-like isolation is enforced in the controller
// via req.user.id — every user reads/writes only their own
// settings row.
// ======================================================

router.get(
  "/",
  authenticate,
  authorize("admin", "pharmacist"),
  getSettings
);

router.put(
  "/",
  authenticate,
  authorize("admin", "pharmacist"),
  updateSettings
);

module.exports = router;

const express = require("express");

const {
  register,
  login
} = require("../controllers/authController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Public Routes
// ======================================================
//
// POST /api/auth/register   create a new user
// POST /api/auth/login      authenticate and get JWT
// ======================================================

router.post("/register", register);

router.post("/login", login);

// ======================================================
// Authenticated Routes
// ======================================================
//
// GET /api/auth/me  return the current user
// ======================================================

router.get("/me", authenticate, (req, res) =>
  res.status(200).json({
    success: true,
    user: req.user
  })
);

// ======================================================
// Admin Test Route
// ======================================================

router.get(
  "/admin-test",
  authenticate,
  authorize("admin"),
  (req, res) =>
    res.status(200).json({
      success: true,
      message: "Admin access granted.",
      user: req.user
    })
);

// ======================================================
// Pharmacist Test Route
// ======================================================

router.get(
  "/pharmacist-test",
  authenticate,
  authorize("admin", "pharmacist"),
  (req, res) =>
    res.status(200).json({
      success: true,
      message: "Pharmacist access granted.",
      user: req.user
    })
);

module.exports = router;
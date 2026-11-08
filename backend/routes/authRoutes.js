
const express = require("express");

const {
  login,
  register,
  resendVerificationEmail,
  verifyEmail,
  setupAdminPassword,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const {
  loginLimiter,
  registrationLimiter,
  emailVerificationLimiter,
  resendVerificationLimiter,
  adminSetupLimiter,
} = require("../middleware/authRateLimit");

const { authenticate } = require("../middleware/authMiddleware");

// ======================================================
// ROUTER
// ======================================================

const router = express.Router();

// ======================================================
// PUBLIC AUTHENTICATION ROUTES
// ======================================================

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// POST /api/auth/register
router.post("/register", registrationLimiter, register);

// ======================================================
// EMAIL VERIFICATION ROUTES
// ======================================================

// GET /api/auth/verify-email/:token
router.get(
  "/verify-email/:token",
  emailVerificationLimiter,
  verifyEmail
);

// POST /api/auth/verify-email
router.post(
  "/verify-email",
  emailVerificationLimiter,
  verifyEmail
);

// POST /api/auth/resend-verification
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerificationEmail
);

// ======================================================
// ADMIN PASSWORD SETUP
// ======================================================

// POST /api/auth/setup-admin-password
router.post(
  "/setup-admin-password",
  adminSetupLimiter,
  setupAdminPassword
);

// ======================================================
// AUTHENTICATED ACCOUNT ROUTES
// ======================================================

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

// PUT /api/auth/profile
router.put("/profile", authenticate, updateProfile);

// PUT /api/auth/password
router.put("/password", authenticate, changePassword);

// POST /api/auth/logout
router.post("/logout", authenticate, (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
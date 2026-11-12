const express = require("express");

const {
  login,
  register,
  resendVerificationEmail,
  verifyEmail,
  setupAdminPassword,
  updateProfile,
  changePassword,
  acceptInvitation,
} = require("../controllers/authController");

const {
  loginLimiter,
  registrationLimiter,
  emailVerificationLimiter,
  resendVerificationLimiter,
  adminSetupLimiter,
  invitationAcceptanceLimiter,
} = require("../middleware/authRateLimit");

const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// PUBLIC AUTHENTICATION ROUTES
// These routes must NOT require authentication.
// ==========================================

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// POST /api/auth/register
router.post("/register", registrationLimiter, register);

// POST /api/auth/accept-invitation
router.post(
  "/accept-invitation",
  invitationAcceptanceLimiter,
  acceptInvitation
);

// ==========================================
// EMAIL VERIFICATION ROUTES
// ==========================================

router.get(
  "/verify-email/:token",
  emailVerificationLimiter,
  verifyEmail
);

router.post(
  "/verify-email",
  emailVerificationLimiter,
  verifyEmail
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerificationEmail
);

// ==========================================
// ADMIN PASSWORD SETUP
// ==========================================

router.post(
  "/setup-admin-password",
  adminSetupLimiter,
  setupAdminPassword
);

// ==========================================
// AUTHENTICATED ACCOUNT ROUTES
// Only these routes require authentication.
// ==========================================

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

module.exports = router;

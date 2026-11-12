
const { rateLimit } = require("express-rate-limit");

// =====================================================
// SHARED RATE LIMITER SETTINGS
// =====================================================

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// =====================================================
// LOGIN RATE LIMITER
// 10 attempts per IP every 15 minutes.
// =====================================================

const loginLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message:
      "Too many login attempts. Please try again after 15 minutes.",
  },
});

// =====================================================
// REGISTRATION RATE LIMITER
// 5 attempts per IP every hour.
// Retained temporarily for legacy registration.
// =====================================================

const registrationLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again after one hour.",
  },
});

// =====================================================
// EMAIL VERIFICATION RATE LIMITER
// 20 attempts per IP every 15 minutes.
// =====================================================

const emailVerificationLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message:
      "Too many verification attempts. Please try again after 15 minutes.",
  },
});

// =====================================================
// RESEND VERIFICATION EMAIL RATE LIMITER
// 3 attempts per IP every hour.
// =====================================================

const resendVerificationLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: {
    success: false,
    message:
      "Too many verification email requests. Please try again after one hour.",
  },
});

// =====================================================
// ADMIN PASSWORD SETUP RATE LIMITER
// 5 attempts per IP every 15 minutes.
// Retained for existing Admin invitations.
// =====================================================

const adminSetupLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message:
      "Too many administrator setup attempts. Please try again after 15 minutes.",
  },
});

// =====================================================
// INVITATION ACCEPTANCE RATE LIMITER
// 5 attempts per IP every 15 minutes.
// =====================================================

const invitationAcceptanceLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message:
      "Too many invitation acceptance attempts. Please try again after 15 minutes.",
  },
});

// =====================================================
// EXPORT RATE LIMITERS
// =====================================================

module.exports = {
  loginLimiter,
  registrationLimiter,
  emailVerificationLimiter,
  resendVerificationLimiter,
  adminSetupLimiter,
  invitationAcceptanceLimiter,
};
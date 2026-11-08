
const express = require("express");

const {
  createAdmin,
  resendAdminInvitation,
  getAdmins,
  getUsers,
  reviewUserRegistration,
  updateUserActivation,
} = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// AUTHENTICATION
// All user-management routes require authentication.
// ======================================================

router.use(authenticate);

// ======================================================
// ADMIN MANAGEMENT — SUPER ADMIN ONLY
// ======================================================

// POST /api/users/admins
router.post(
  "/admins",
  authorize("superadmin"),
  createAdmin
);

// GET /api/users/admins
router.get(
  "/admins",
  authorize("superadmin"),
  getAdmins
);

// POST /api/users/admins/:id/resend-invitation
router.post(
  "/admins/:id/resend-invitation",
  authorize("superadmin"),
  resendAdminInvitation
);

// ======================================================
// GENERAL USER MANAGEMENT
// ======================================================

// GET /api/users
// GET /api/users?approvalStatus=pending
router.get(
  "/",
  authorize("superadmin", "admin"),
  getUsers
);

// ======================================================
// STAFF REGISTRATION APPROVAL
// ======================================================

// PATCH /api/users/:id/approval
router.patch(
  "/:id/approval",
  authorize("superadmin", "admin"),
  reviewUserRegistration
);

// ======================================================
// ACCOUNT ACTIVATION
// SUPER ADMIN ONLY
// ======================================================

// PATCH /api/users/:id/activation
router.patch(
  "/:id/activation",
  authorize("superadmin"),
  updateUserActivation
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
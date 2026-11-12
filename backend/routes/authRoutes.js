

const express = require("express");

const {
  createAdmin,
  resendAdminInvitation,
  getAdmins,

  createStaffInvitation,
  resendStaffInvitation,
  getStaff,

  getUsers,
  reviewUserRegistration,
  updateUserActivation,
} = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All user management routes require authentication.
router.use(authenticate);

// =====================================================
// ADMIN MANAGEMENT
// Super Admin only
// =====================================================

router.post(
  "/admins",
  authorize("superadmin"),
  createAdmin
);

router.get(
  "/admins",
  authorize("superadmin"),
  getAdmins
);

router.post(
  "/admins/:id/resend-invitation",
  authorize("superadmin"),
  resendAdminInvitation
);

// =====================================================
// STAFF INVITATION MANAGEMENT
// Admin and Super Admin
// =====================================================

router.post(
  "/invitations",
  authorize("admin", "superadmin"),
  createStaffInvitation
);

router.get(
  "/staff",
  authorize("admin", "superadmin"),
  getStaff
);

router.post(
  "/invitations/:id/resend",
  authorize("admin", "superadmin"),
  resendStaffInvitation
);

// =====================================================
// ACCOUNT LISTING AND LEGACY REGISTRATION APPROVAL
// Admin and Super Admin
// =====================================================

router.get(
  "/",
  authorize("admin", "superadmin"),
  getUsers
);

router.patch(
  "/:id/approval",
  authorize("admin", "superadmin"),
  reviewUserRegistration
);

// =====================================================
// ACCOUNT ACTIVATION
// Controller enforces ownership and role permissions.
// =====================================================

router.patch(
  "/:id/activation",
  authorize("admin", "superadmin"),
  updateUserActivation
);

module.exports = router;

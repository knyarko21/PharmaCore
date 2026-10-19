
const { User } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message
  });

const VALID_ROLES = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

const VALID_APPROVAL_STATUSES = [
  "approved",
  "rejected"
];

const toSafeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  approvalStatus: user.approvalStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const writeAuditLog = async ({
  req,
  action,
  description,
  entityId
}) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      action,
      module: "users",
      description,
      entityType: "User",
      entityId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
  } catch (error) {
    // Do not silently hide audit failures.
    // The approval action remains successful, but the failure is logged.
    console.error("User management audit log error:", error.message);
  }
};

// ======================================================
// List Users
// GET /api/users
//
// Admin only.
// Optional query: ?approvalStatus=pending
// ======================================================

const getUsers = async (req, res) => {
  try {
    const { approvalStatus } = req.query;

    const where = {};

    if (approvalStatus) {
      if (
        ![
          "pending",
          "approved",
          "rejected"
        ].includes(approvalStatus)
      ) {
        return sendError(
          res,
          400,
          "Invalid approval status filter."
        );
      }

      where.approvalStatus = approvalStatus;
    }

    const users = await User.findAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "isActive",
        "approvalStatus",
        "createdAt",
        "updatedAt"
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(toSafeUser)
    });
  } catch (error) {
    logError("Get users error:", error);

    return sendError(
      res,
      500,
      "Unable to retrieve users."
    );
  }
};

// ======================================================
// Review Registration
// PATCH /api/users/:id/approval
//
// Admin only.
// Body:
// {
//   "approvalStatus": "approved",
//   "role": "pharmacist"
// }
//
// For rejection, role is optional.
// ======================================================

const reviewUserRegistration = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (
      !Number.isInteger(targetUserId) ||
      targetUserId <= 0
    ) {
      return sendError(
        res,
        400,
        "A valid user ID is required."
      );
    }

    const {
      approvalStatus,
      role
    } = req.body || {};

    if (
      !VALID_APPROVAL_STATUSES.includes(approvalStatus)
    ) {
      return sendError(
        res,
        400,
        "Approval status must be approved or rejected."
      );
    }

    if (
      approvalStatus === "approved" &&
      !VALID_ROLES.filter((item) => item !== "admin").includes(role)
    ) {
      return sendError(
        res,
        400,
        "Choose a valid non-admin role when approving a registration."
      );
    }

    if (
      role !== undefined &&
      !VALID_ROLES.includes(role)
    ) {
      return sendError(
        res,
        400,
        "Invalid user role."
      );
    }

    const user = await User.findByPk(targetUserId);

    if (!user) {
      return sendError(
        res,
        404,
        "User account not found."
      );
    }

    // Do not let the administrator accidentally revoke
    // their own administrator access through this endpoint.
    if (Number(user.id) === Number(req.user.id)) {
      return sendError(
        res,
        400,
        "You cannot change your own approval status through this endpoint."
      );
    }

    // Public registration must never be used to create
    // additional administrator accounts.
    if (user.role === "admin") {
      return sendError(
        res,
        403,
        "Administrator accounts cannot be reviewed through this endpoint."
      );
    }

    const previousStatus = user.approvalStatus;
    const previousRole = user.role;

    user.approvalStatus = approvalStatus;

    if (approvalStatus === "approved") {
      user.role = role;
      user.isActive = true;
    }

    await user.save();

    await writeAuditLog({
      req,
      action: approvalStatus === "approved" ? "approve" : "reject",
      description:
        `Administrator ${req.user.email} changed user ${user.email} approval status from ${previousStatus} to ${approvalStatus}. Role: ${previousRole} -> ${user.role}.`,
      entityId: user.id
    });

    return res.status(200).json({
      success: true,
      message:
        approvalStatus === "approved"
          ? "User approved successfully."
          : "Registration rejected successfully.",
      user: toSafeUser(user)
    });
  } catch (error) {
    logError("Review user registration error:", error);

    return sendError(
      res,
      500,
      "Unable to review registration."
    );
  }
};

// ======================================================
// Update User Activation
// PATCH /api/users/:id/activation
//
// Admin only.
// Body: { "isActive": false }
// ======================================================

const updateUserActivation = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { isActive } = req.body || {};

    if (
      !Number.isInteger(targetUserId) ||
      targetUserId <= 0
    ) {
      return sendError(
        res,
        400,
        "A valid user ID is required."
      );
    }

    if (typeof isActive !== "boolean") {
      return sendError(
        res,
        400,
        "isActive must be true or false."
      );
    }

    const user = await User.findByPk(targetUserId);

    if (!user) {
      return sendError(
        res,
        404,
        "User account not found."
      );
    }

    if (Number(user.id) === Number(req.user.id)) {
      return sendError(
        res,
        400,
        "You cannot deactivate your own account."
      );
    }

    if (user.role === "admin") {
      return sendError(
        res,
        403,
        "Administrator accounts cannot be changed through this endpoint."
      );
    }

    user.isActive = isActive;
    await user.save();

    await writeAuditLog({
      req,
      action: isActive ? "activate" : "deactivate",
      description:
        `Administrator ${req.user.email} ${isActive ? "activated" : "deactivated"} user ${user.email}.`,
      entityId: user.id
    });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User account activated successfully."
        : "User account deactivated successfully.",
      user: toSafeUser(user)
    });
  } catch (error) {
    logError("Update user activation error:", error);

    return sendError(
      res,
      500,
      "Unable to update user activation."
    );
  }
};

module.exports = {
  getUsers,
  reviewUserRegistration,
  updateUserActivation
};
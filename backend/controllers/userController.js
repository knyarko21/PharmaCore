

const { User } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const STAFF_ROLES = [
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement",
];

const VALID_APPROVAL_STATUSES = [
  "approved",
  "rejected",
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
  updatedAt: user.updatedAt,
});

const writeAuditLog = async ({
  req,
  action,
  description,
  entityId,
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
      userAgent: req.get("user-agent"),
    });
  } catch (error) {
    console.error(
      "User management audit log error:",
      error.message
    );
  }
};

// =============================================
// GET /api/users
// Optional filter: ?approvalStatus=pending
// Admin only.
// =============================================

const getUsers = async (req, res) => {
  try {
    const { approvalStatus } = req.query;
    const where = {};

    if (approvalStatus) {
      if (
        ![
          "pending",
          "approved",
          "rejected",
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
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(toSafeUser),
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

// =============================================
// PATCH /api/users/:id/approval
//
// Approve:
// { "approvalStatus": "approved", "role": "pharmacist" }
//
// Reject:
// { "approvalStatus": "rejected" }
//
// Admin only.
// =============================================

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

    const { approvalStatus, role } = req.body || {};

    if (!VALID_APPROVAL_STATUSES.includes(approvalStatus)) {
      return sendError(
        res,
        400,
        "Approval status must be approved or rejected."
      );
    }

    if (
      approvalStatus === "approved" &&
      !STAFF_ROLES.includes(role)
    ) {
      return sendError(
        res,
        400,
        "Choose a valid staff role when approving a registration."
      );
    }

    // Do not allow the role field to be used for
    // arbitrary role changes during rejection.
    if (
      approvalStatus === "rejected" &&
      role !== undefined
    ) {
      return sendError(
        res,
        400,
        "Do not provide a role when rejecting a registration."
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
        "You cannot review your own account."
      );
    }

    // Protect all existing administrator accounts.
    if (user.role === "admin") {
      return sendError(
        res,
        403,
        "Administrator accounts cannot be reviewed through this endpoint."
      );
    }

    // This endpoint is for pending registrations only.
    if (user.approvalStatus !== "pending") {
      return sendError(
        res,
        409,
        "This registration has already been reviewed."
      );
    }

    const previousRole = user.role;

    user.approvalStatus = approvalStatus;

    if (approvalStatus === "approved") {
      user.role = role;
      user.isActive = true;
    }

    await user.save();

    await writeAuditLog({
      req,
      action:
        approvalStatus === "approved"
          ? "approve"
          : "reject",
      description:
        `Administrator ${req.user.email} ${approvalStatus} registration for ${user.email}. Role: ${previousRole} -> ${user.role}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message:
        approvalStatus === "approved"
          ? "User approved successfully. They can now sign in."
          : "Registration rejected successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Review user registration error:", error);

    if (error.name === "SequelizeValidationError") {
      return sendError(
        res,
        400,
        "The requested user role or approval status is invalid."
      );
    }

    return sendError(
      res,
      500,
      "Unable to review registration."
    );
  }
};

// =============================================
// PATCH /api/users/:id/activation
// Body: { "isActive": false }
// Admin only.
// =============================================

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
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User account activated successfully."
        : "User account deactivated successfully.",
      user: toSafeUser(user),
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
  updateUserActivation,
};


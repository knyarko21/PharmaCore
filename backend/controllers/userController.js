
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { User, sequelize } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

const {
  generateVerificationToken,
  getVerificationExpiry,
} = require("../services/emailVerificationService");

const {
  sendVerificationEmail,
  sendAdminPasswordSetupEmail,
  sendStaffApprovalEmail,
  sendStaffRejectionEmail,
} = require("../services/emailService");

// ======================================================
// CONSTANTS
// ======================================================

const STAFF_ROLES = [
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement",
];

const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;

// ======================================================
// GENERAL HELPERS
// ======================================================

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const logError = (context, error) => {
  console.error(context, error?.message || error);
};

const normalizeEmail = (email) =>
  email.trim().toLowerCase();

const toSafeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  requestedRole: user.requestedRole || null,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  approvalStatus: user.approvalStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ======================================================
// AUDIT LOGGING
// ======================================================

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
    logError(
      "User management audit logging failed:",
      error
    );
  }
};

// ======================================================
// FIND TARGET USER
// ======================================================

const getTargetUser = async (targetUserId, res) => {
  const user = await User.findByPk(targetUserId);

  if (!user) {
    sendError(res, 404, "User account not found.");
    return null;
  }

  return user;
};

// ======================================================
// PERMISSION HELPERS
// ======================================================

const canReviewRegistration = (requester, target) => {
  const hasReviewPermission = [
    "admin",
    "superadmin",
  ].includes(requester.role);

  const applicantRole =
    target.requestedRole || target.role;

  return (
    hasReviewPermission &&
    STAFF_ROLES.includes(applicantRole)
  );
};

const canManageActivation = (requester, target) => {
  return (
    requester.role === "superadmin" &&
    target.role !== "superadmin"
  );
};

// ======================================================
// POST /api/users/admins
// Super Admin creates an Admin invitation.
// ======================================================

const createAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
    } = req.body || {};

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return sendError(
        res,
        400,
        "First name, last name and email are required."
      );
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedFirstName.length > 50 ||
      normalizedLastName.length > 50
    ) {
      return sendError(
        res,
        400,
        "First name and last name must not exceed 50 characters."
      );
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    const existingUser = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    // Generate an unpredictable temporary password.
    // The invited Admin will create their own password.

    const temporaryPassword = crypto
      .randomBytes(48)
      .toString("hex");

    const verificationToken =
      generateVerificationToken();

    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      BCRYPT_ROUNDS
    );

    const user = await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      approvalStatus: "approved",
      isActive: false,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: getVerificationExpiry(),
    });

    // Audit account creation even if email delivery fails.

    await writeAuditLog({
      req,
      action: "create_admin",
      description:
        `Super Admin ${req.user.id} created an Admin invitation for user ${user.id}.`,
      entityId: user.id,
    });

    // Send the verification email.

    try {
      await sendVerificationEmail({
        email: normalizedEmail,
        firstName: normalizedFirstName,
        token: verificationToken,
      });

      return res.status(201).json({
        success: true,
        emailSent: true,
        message:
          "Admin invitation created. The invited user must verify their email and set a password before activation.",
        user: toSafeUser(user),
      });
    } catch (emailError) {
      logError(
        "Admin invitation email failed:",
        emailError
      );

      return res.status(202).json({
        success: true,
        emailSent: false,
        message:
          "The Admin account was created, but the invitation email could not be delivered. Use the resend invitation action to try again.",
        user: toSafeUser(user),
      });
    }
  } catch (error) {
    logError("Create Admin error:", error);

    if (
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    if (
      error.name === "SequelizeValidationError"
    ) {
      return sendError(
        res,
        400,
        "The Admin account details are invalid."
      );
    }

    return sendError(
      res,
      500,
      "Unable to create Admin invitation."
    );
  }
};

// ======================================================
// POST /api/users/admins/:id/resend-invitation
// Super Admin resends an Admin invitation.
// ======================================================

const resendAdminInvitation = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (
      !Number.isSafeInteger(targetUserId) ||
      targetUserId <= 0
    ) {
      return sendError(
        res,
        400,
        "A valid user ID is required."
      );
    }

    if (req.user.role !== "superadmin") {
      return sendError(
        res,
        403,
        "Only a Super Admin can resend Admin invitations."
      );
    }

    // Generate and save a fresh token while holding a
    // database row lock. This prevents simultaneous
    // resend requests from issuing competing tokens.

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(
          targetUserId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!user) {
          return {
            errorStatus: 404,
            errorMessage: "User account not found.",
          };
        }

        if (user.role !== "admin") {
          return {
            errorStatus: 400,
            errorMessage:
              "This account is not an Admin account.",
          };
        }

        if (user.isActive) {
          return {
            errorStatus: 409,
            errorMessage:
              "This Admin account is already active.",
          };
        }

        if (user.approvalStatus !== "approved") {
          return {
            errorStatus: 409,
            errorMessage:
              "Only approved Admin accounts can receive invitations.",
          };
        }

        if (
          user.isEmailVerified &&
          !user.emailVerificationToken
        ) {
          return {
            errorStatus: 409,
            errorMessage:
              "This Admin has already completed password setup. Use the account activation action instead.",
          };
        }

        const token = generateVerificationToken();

        user.emailVerificationToken = token;
        user.emailVerificationExpiresAt =
          getVerificationExpiry();

        await user.save({
          transaction,
        });

        return {
          user,
          token,
          emailType: user.isEmailVerified
            ? "password_setup"
            : "verification",
        };
      }
    );

    if (result.errorStatus) {
      return sendError(
        res,
        result.errorStatus,
        result.errorMessage
      );
    }

    const { user, token, emailType } = result;

    // Send the appropriate email after the transaction
    // has committed. A failed email can be retried.

    try {
      if (emailType === "verification") {
        await sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
          token,
        });
      } else {
        await sendAdminPasswordSetupEmail({
          email: user.email,
          firstName: user.firstName,
          token,
        });
      }
    } catch (emailError) {
      logError(
        "Resend Admin invitation email failed:",
        emailError
      );

      await writeAuditLog({
        req,
        action: "admin_invitation_email_failed",
        description:
          `Super Admin ${req.user.id} attempted to resend an Admin invitation to user ${user.id}, but email delivery failed.`,
        entityId: user.id,
      });

      return res.status(503).json({
        success: false,
        emailSent: false,
        message:
          "A new invitation token was generated, but the email could not be delivered. Please try resending the invitation.",
      });
    }

    await writeAuditLog({
      req,
      action: "resend_admin_invitation",
      description:
        `Super Admin ${req.user.id} resent the ${
          emailType === "verification"
            ? "email verification"
            : "password setup"
        } invitation to Admin user ${user.id}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      message:
        emailType === "verification"
          ? "Admin email verification invitation resent successfully."
          : "Admin password setup invitation resent successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Resend Admin invitation error:", error);

    return sendError(
      res,
      500,
      "Unable to resend Admin invitation."
    );
  }
};

// ======================================================
// GET /api/users/admins
// Super Admin views Admin accounts.
// ======================================================

const getAdmins = async (_req, res) => {
  try {
    const admins = await User.findAll({
      where: {
        role: "admin",
      },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "requestedRole",
        "isActive",
        "isEmailVerified",
        "approvalStatus",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins: admins.map(toSafeUser),
    });
  } catch (error) {
    logError("Get Admins error:", error);

    return sendError(
      res,
      500,
      "Unable to retrieve Admin accounts."
    );
  }
};

// ======================================================
// GET /api/users
// Optional filter: ?approvalStatus=pending
// ======================================================

const getUsers = async (req, res) => {
  try {
    const { approvalStatus } = req.query;
    const where = {};

    if (approvalStatus !== undefined) {
      if (!APPROVAL_STATUSES.includes(approvalStatus)) {
        return sendError(
          res,
          400,
          "Invalid approval status filter."
        );
      }

      where.approvalStatus = approvalStatus;
    }

    // Ordinary Admins must not see Super Admin accounts.

    if (req.user.role === "admin") {
      where.role = {
        [Op.ne]: "superadmin",
      };
    }

    const users = await User.findAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "requestedRole",
        "isActive",
        "isEmailVerified",
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

// ======================================================
// PATCH /api/users/:id/approval
// Admin and Super Admin review ordinary staff.
// ======================================================

const reviewUserRegistration = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (
      !Number.isSafeInteger(targetUserId) ||
      targetUserId <= 0
    ) {
      return sendError(
        res,
        400,
        "A valid user ID is required."
      );
    }

    const { approvalStatus, role } = req.body || {};

    if (
      !["approved", "rejected"].includes(approvalStatus)
    ) {
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

    // The transaction and row lock ensure that two
    // administrators cannot approve/reject the same
    // pending registration simultaneously.

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(
          targetUserId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!user) {
          return {
            errorStatus: 404,
            errorMessage: "User account not found.",
          };
        }

        if (Number(user.id) === Number(req.user.id)) {
          return {
            errorStatus: 400,
            errorMessage:
              "You cannot review your own account.",
          };
        }

        if (!canReviewRegistration(req.user, user)) {
          return {
            errorStatus: 403,
            errorMessage:
              "You can only review ordinary staff registrations.",
          };
        }

        if (user.approvalStatus !== "pending") {
          return {
            errorStatus: 409,
            errorMessage:
              "This registration has already been reviewed.",
          };
        }

        if (
          approvalStatus === "approved" &&
          !user.isEmailVerified
        ) {
          return {
            errorStatus: 409,
            errorMessage:
              "This user's email must be verified before approval.",
          };
        }

        const previousRole = user.role;
        const requestedRole =
          user.requestedRole || previousRole;

        user.approvalStatus = approvalStatus;

        if (approvalStatus === "approved") {
          // The reviewing administrator explicitly chooses
          // the final assigned role.
          user.role = role;
          user.isActive = true;
        } else {
          user.isActive = false;
        }

        await user.save({
          transaction,
        });

        return {
          user,
          previousRole,
          requestedRole,
        };
      }
    );

    if (result.errorStatus) {
      return sendError(
        res,
        result.errorStatus,
        result.errorMessage
      );
    }

    const {
      user,
      previousRole,
      requestedRole,
    } = result;

    // The database decision is committed before sending
    // emails. Email failure must not undo the decision.

    await writeAuditLog({
      req,
      action:
        approvalStatus === "approved"
          ? "approve"
          : "reject",
      description:
        `User ${req.user.id} ${approvalStatus} registration for user ${user.id}. ` +
        `Requested role: ${requestedRole}. ` +
        `Previous role: ${previousRole}. ` +
        `Assigned role: ${user.role}.`,
      entityId: user.id,
    });

    let emailSent = false;

    try {
      if (approvalStatus === "approved") {
        await sendStaffApprovalEmail({
          email: user.email,
          firstName: user.firstName,
          role: user.role,
        });
      } else {
        await sendStaffRejectionEmail({
          email: user.email,
          firstName: user.firstName,
        });
      }

      emailSent = true;
    } catch (emailError) {
      logError(
        "Staff registration decision email failed:",
        emailError
      );
    }

    let message;

    if (approvalStatus === "approved") {
      message = emailSent
        ? "User approved successfully. An approval email has been sent."
        : "User approved successfully, but the approval email could not be sent.";
    } else {
      message = emailSent
        ? "Registration rejected successfully. A notification email has been sent."
        : "Registration rejected successfully, but the notification email could not be sent.";
    }

    return res.status(200).json({
      success: true,
      emailSent,
      message,
      user: toSafeUser(user),
    });
  } catch (error) {
    logError(
      "Review user registration error:",
      error
    );

    if (
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeDatabaseError"
    ) {
      return sendError(
        res,
        400,
        "The requested role or approval status is invalid."
      );
    }

    return sendError(
      res,
      500,
      "Unable to review registration."
    );
  }
};

// ======================================================
// PATCH /api/users/:id/activation
// Super Admin only.
// ======================================================

const updateUserActivation = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);

    if (
      !Number.isSafeInteger(targetUserId) ||
      targetUserId <= 0
    ) {
      return sendError(
        res,
        400,
        "A valid user ID is required."
      );
    }

    const { isActive } = req.body || {};

    if (typeof isActive !== "boolean") {
      return sendError(
        res,
        400,
        "isActive must be true or false."
      );
    }

    if (req.user.role !== "superadmin") {
      return sendError(
        res,
        403,
        "Only a Super Admin can manage account activation."
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(
          targetUserId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!user) {
          return {
            errorStatus: 404,
            errorMessage: "User account not found.",
          };
        }

        if (Number(user.id) === Number(req.user.id)) {
          return {
            errorStatus: 400,
            errorMessage:
              "You cannot change your own account status.",
          };
        }

        if (!canManageActivation(req.user, user)) {
          return {
            errorStatus: 403,
            errorMessage:
              "Only a Super Admin can manage this account.",
          };
        }

        if (
          isActive &&
          user.approvalStatus !== "approved"
        ) {
          return {
            errorStatus: 409,
            errorMessage:
              "Only approved user accounts can be activated.",
          };
        }

        if (isActive && !user.isEmailVerified) {
          return {
            errorStatus: 409,
            errorMessage:
              "The user's email must be verified before activation.",
          };
        }

        if (user.isActive === isActive) {
          return {
            alreadyInRequestedState: true,
            user,
          };
        }

        user.isActive = isActive;

        await user.save({
          transaction,
        });

        return {
          user,
        };
      }
    );

    if (result.errorStatus) {
      return sendError(
        res,
        result.errorStatus,
        result.errorMessage
      );
    }

    const { user } = result;

    if (result.alreadyInRequestedState) {
      return res.status(200).json({
        success: true,
        message: isActive
          ? "User account is already active."
          : "User account is already inactive.",
        user: toSafeUser(user),
      });
    }

    await writeAuditLog({
      req,
      action: isActive ? "activate" : "deactivate",
      description:
        `User ${req.user.id} ${
          isActive ? "activated" : "deactivated"
        } user ${user.id}.`,
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
    logError(
      "Update user activation error:",
      error
    );

    return sendError(
      res,
      500,
      "Unable to update user activation."
    );
  }
};

// ======================================================
// EXPORT CONTROLLER FUNCTIONS
// ======================================================

module.exports = {
  createAdmin,
  resendAdminInvitation,
  getAdmins,
  getUsers,
  reviewUserRegistration,
  updateUserActivation,
};
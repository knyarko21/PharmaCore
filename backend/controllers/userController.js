

const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { User, sequelize } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

const {
  sendUserInvitationEmail,
  sendStaffApprovalEmail,
  sendStaffRejectionEmail,
} = require("../services/emailService");

// =====================================================
// CONSTANTS
// =====================================================

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
const INVITATION_EXPIRY_HOURS = 24;

// =====================================================
// GENERAL HELPERS
// =====================================================

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

const generateInvitationToken = () =>
  crypto.randomBytes(32).toString("hex");

const hashInvitationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getInvitationExpiry = () =>
  new Date(
    Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000
  );

const getInviterName = (user) => {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return name || "PharmaCore administrator";
};

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
  invitedByUserId: user.invitedByUserId || null,
  invitationAcceptedAt: user.invitationAcceptedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// =====================================================
// AUDIT LOGGING
// =====================================================

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

// =====================================================
// PERMISSION HELPERS
// =====================================================

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
  if (requester.role === "superadmin") {
    return target.role !== "superadmin";
  }

  if (requester.role === "admin") {
    return (
      STAFF_ROLES.includes(target.role) &&
      Number(target.invitedByUserId) === Number(requester.id)
    );
  }

  return false;
};

const validateNameAndEmail = ({
  firstName,
  lastName,
  email,
}) => {
  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return "First name, last name and email are required.";
  }

  if (
    firstName.trim().length > 50 ||
    lastName.trim().length > 50
  ) {
    return "First name and last name must not exceed 50 characters.";
  }

  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    return "Please provide a valid email address.";
  }

  return null;
};

// =====================================================
// SHARED INVITATION CREATION
// =====================================================

const createInvitation = async ({
  req,
  firstName,
  lastName,
  email,
  role,
}) => {
  const token = generateInvitationToken();

  // The User model requires a password before invitation
  // acceptance. This random password cannot be used by the invitee.
  const temporaryPassword = crypto.randomBytes(48).toString("hex");

  const hashedPassword = await bcrypt.hash(
    temporaryPassword,
    BCRYPT_ROUNDS
  );

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizeEmail(email),
    password: hashedPassword,

    role,
    requestedRole: null,

    approvalStatus: "approved",
    isActive: false,
    isEmailVerified: false,

    emailVerificationToken: null,
    emailVerificationExpiresAt: null,

    invitationTokenHash: hashInvitationToken(token),
    invitationExpiresAt: getInvitationExpiry(),
    invitedByUserId: req.user.id,
    invitationAcceptedAt: null,
  });

  return {
    user,
    token,
  };
};

const sendInvitation = async ({
  user,
  token,
  inviter,
}) => {
  await sendUserInvitationEmail({
    email: user.email,
    firstName: user.firstName,
    role: user.role,
    token,
    inviterName: getInviterName(inviter),
  });
};

// =====================================================
// POST /api/users/admins
// Super Admin creates an Admin invitation.
// =====================================================

const createAdmin = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return sendError(
        res,
        403,
        "Only a Super Admin can invite Admin accounts."
      );
    }

    const {
      firstName,
      lastName,
      email,
    } = req.body || {};

    const validationError = validateNameAndEmail({
      firstName,
      lastName,
      email,
    });

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const normalizedEmail = normalizeEmail(email);

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

    const { user, token } = await createInvitation({
      req,
      firstName,
      lastName,
      email: normalizedEmail,
      role: "admin",
    });

    await writeAuditLog({
      req,
      action: "create_admin_invitation",
      description:
        `Super Admin ${req.user.id} created an Admin invitation for user ${user.id}.`,
      entityId: user.id,
    });

    let emailSent = false;

    try {
      await sendInvitation({
        user,
        token,
        inviter: req.user,
      });

      emailSent = true;
    } catch (emailError) {
      logError("Admin invitation email failed:", emailError);
    }

    return res.status(emailSent ? 201 : 202).json({
      success: true,
      emailSent,
      message: emailSent
        ? "Admin invitation created and sent successfully. The invited Admin must accept the invitation before Super Admin activation."
        : "The Admin account was created, but the invitation email could not be delivered. Please resend the invitation.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Create Admin invitation error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    if (error.name === "SequelizeValidationError") {
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

// =====================================================
// POST /api/users/invitations
// Admin and Super Admin invite staff.
// =====================================================

const createStaffInvitation = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You are not permitted to invite staff."
      );
    }

    const {
      firstName,
      lastName,
      email,
      role,
    } = req.body || {};

    const validationError = validateNameAndEmail({
      firstName,
      lastName,
      email,
    });

    if (validationError) {
      return sendError(res, 400, validationError);
    }

    if (!STAFF_ROLES.includes(role)) {
      return sendError(
        res,
        400,
        "Choose a valid staff role. Admin and Super Admin roles cannot be assigned through staff invitations."
      );
    }

    const normalizedEmail = normalizeEmail(email);

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

    const { user, token } = await createInvitation({
      req,
      firstName,
      lastName,
      email: normalizedEmail,
      role,
    });

    await writeAuditLog({
      req,
      action: "create_staff_invitation",
      description:
        `User ${req.user.id} (${req.user.role}) invited user ${user.id} with role ${role}.`,
      entityId: user.id,
    });

    let emailSent = false;

    try {
      await sendInvitation({
        user,
        token,
        inviter: req.user,
      });

      emailSent = true;
    } catch (emailError) {
      logError("Staff invitation email failed:", emailError);
    }

    return res.status(emailSent ? 201 : 202).json({
      success: true,
      emailSent,
      message: emailSent
        ? "Staff invitation created and sent successfully."
        : "The staff account was created, but the invitation email could not be delivered. Please resend the invitation.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Create staff invitation error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    if (error.name === "SequelizeValidationError") {
      return sendError(
        res,
        400,
        "The staff account details are invalid."
      );
    }

    return sendError(
      res,
      500,
      "Unable to create staff invitation."
    );
  }
};

// =====================================================
// SHARED INVITATION RESEND
// =====================================================

const resendInvitation = async ({
  req,
  targetUserId,
  expectedRole,
}) => {
  return sequelize.transaction(
    async (transaction) => {
      const user = await User.findByPk(targetUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!user) {
        return {
          errorStatus: 404,
          errorMessage: "User account not found.",
        };
      }

      // Admin invitations require the exact Admin role.
      // Staff invitations accept any supported staff role.
      const validRole =
        expectedRole === "admin"
          ? user.role === "admin"
          : STAFF_ROLES.includes(user.role);

      if (!validRole) {
        return {
          errorStatus: 400,
          errorMessage:
            "This account does not have the expected role.",
        };
      }

      // Check ownership BEFORE rotating the invitation token.
      if (
        req.user.role === "admin" &&
        (
          !STAFF_ROLES.includes(user.role) ||
          Number(user.invitedByUserId) !== Number(req.user.id)
        )
      ) {
        return {
          errorStatus: 403,
          errorMessage:
            "You can only resend invitations for staff members you invited.",
        };
      }

      if (user.isActive) {
        return {
          errorStatus: 409,
          errorMessage: "This account is already active.",
        };
      }

      if (user.approvalStatus !== "approved") {
        return {
          errorStatus: 409,
          errorMessage:
            "Only approved accounts can receive invitations.",
        };
      }

      if (user.invitationAcceptedAt) {
        return {
          errorStatus: 409,
          errorMessage:
            "This invitation has already been accepted. Use account activation instead.",
        };
      }

      // A legacy Admin who has already completed password
      // setup should be activated, not invited again.
      if (
        expectedRole === "admin" &&
        user.isEmailVerified &&
        !user.invitationTokenHash
      ) {
        return {
          errorStatus: 409,
          errorMessage:
            "This Admin has already completed password setup. Use the account activation action instead.",
        };
      }

      const token = generateInvitationToken();

      user.invitationTokenHash = hashInvitationToken(token);
      user.invitationExpiresAt = getInvitationExpiry();

      // Invalidate any older email verification token.
      user.emailVerificationToken = null;
      user.emailVerificationExpiresAt = null;

      await user.save({
        transaction,
      });

      return {
        user,
        token,
      };
    }
  );
};

// =====================================================
// POST /api/users/admins/:id/resend-invitation
// Super Admin resends an Admin invitation.
// =====================================================

const resendAdminInvitation = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return sendError(
        res,
        403,
        "Only a Super Admin can resend Admin invitations."
      );
    }

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

    const result = await resendInvitation({
      req,
      targetUserId,
      expectedRole: "admin",
    });

    if (result.errorStatus) {
      return sendError(
        res,
        result.errorStatus,
        result.errorMessage
      );
    }

    const { user, token } = result;

    try {
      await sendInvitation({
        user,
        token,
        inviter: req.user,
      });
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
        `Super Admin ${req.user.id} resent an Admin invitation to user ${user.id}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: "Admin invitation resent successfully.",
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

// =====================================================
// POST /api/users/invitations/:id/resend
// Admin and Super Admin resend staff invitations.
// =====================================================

const resendStaffInvitation = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You are not permitted to resend staff invitations."
      );
    }

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

    const result = await resendInvitation({
      req,
      targetUserId,
      expectedRole: "staff",
    });

    if (result.errorStatus) {
      return sendError(
        res,
        result.errorStatus,
        result.errorMessage
      );
    }

    const { user, token } = result;

    try {
      await sendInvitation({
        user,
        token,
        inviter: req.user,
      });
    } catch (emailError) {
      logError(
        "Resend staff invitation email failed:",
        emailError
      );

      await writeAuditLog({
        req,
        action: "staff_invitation_email_failed",
        description:
          `User ${req.user.id} attempted to resend a staff invitation to user ${user.id}, but email delivery failed.`,
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
      action: "resend_staff_invitation",
      description:
        `User ${req.user.id} resent a staff invitation to user ${user.id}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: "Staff invitation resent successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Resend staff invitation error:", error);

    return sendError(
      res,
      500,
      "Unable to resend staff invitation."
    );
  }
};

// =====================================================
// GET /api/users/admins
// Super Admin views Admin accounts.
// =====================================================

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
        "invitedByUserId",
        "invitationAcceptedAt",
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

// =====================================================
// GET /api/users/staff
// Admin sees own invitees; Super Admin sees all staff.
// =====================================================

const getStaff = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You are not permitted to view staff accounts."
      );
    }

    const where = {
      role: {
        [Op.in]: STAFF_ROLES,
      },
    };

    if (req.user.role === "admin") {
      where.invitedByUserId = req.user.id;
    }

    const staff = await User.findAll({
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
        "invitedByUserId",
        "invitationAcceptedAt",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: staff.length,
      staff: staff.map(toSafeUser),
    });
  } catch (error) {
    logError("Get staff error:", error);

    return sendError(
      res,
      500,
      "Unable to retrieve staff accounts."
    );
  }
};

// =====================================================
// GET /api/users
// Legacy registration listing.
// Optional filter: ?approvalStatus=pending
// =====================================================

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
        "invitedByUserId",
        "invitationAcceptedAt",
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

// =====================================================
// PATCH /api/users/:id/approval
// Legacy Admin and Super Admin registration review.
// =====================================================

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

    if (!["approved", "rejected"].includes(approvalStatus)) {
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

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(targetUserId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          return {
            errorStatus: 404,
            errorMessage: "User account not found.",
          };
        }

        if (Number(user.id) === Number(req.user.id)) {
          return {
            errorStatus: 400,
            errorMessage: "You cannot review your own account.",
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

    await writeAuditLog({
      req,
      action: approvalStatus === "approved"
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
    logError("Review user registration error:", error);

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

// =====================================================
// PATCH /api/users/:id/activation
// Super Admin manages all accounts except Super Admin.
// Admin manages only their own staff invitees.
// =====================================================

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

    if (!["admin", "superadmin"].includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You are not permitted to manage account activation."
      );
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findByPk(targetUserId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          return {
            errorStatus: 404,
            errorMessage: "User account not found.",
          };
        }

        if (Number(user.id) === Number(req.user.id)) {
          return {
            errorStatus: 400,
            errorMessage: "You cannot change your own account status.",
          };
        }

        if (!canManageActivation(req.user, user)) {
          return {
            errorStatus: 403,
            errorMessage:
              "You are not permitted to manage this account.",
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
        `User ${req.user.id} (${req.user.role}) ${
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
    logError("Update user activation error:", error);

    return sendError(
      res,
      500,
      "Unable to update user activation."
    );
  }
};

// =====================================================
// EXPORT CONTROLLER FUNCTIONS
// =====================================================

module.exports = {
  createAdmin,
  resendAdminInvitation,
  getAdmins,

  createStaffInvitation,
  resendStaffInvitation,
  getStaff,

  getUsers,
  reviewUserRegistration,
  updateUserActivation,
};

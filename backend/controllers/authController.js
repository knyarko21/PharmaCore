
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User, sequelize } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

const {
  generateVerificationToken,
  getVerificationExpiry,
} = require("../services/emailVerificationService");

const {
  sendVerificationEmail,
  sendAdminPasswordSetupEmail,
  sendNewStaffRegistrationNotificationEmail,
} = require("../services/emailService");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_MAX_BYTES = 72;
const BCRYPT_ROUNDS = 12;

const STAFF_ROLES = [
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement",
];

// ======================================================
// General Helpers
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

const isValidEmail = (email) =>
  typeof email === "string" &&
  EMAIL_PATTERN.test(email);

const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length === 0
  ) {
    return "Password is required.";
  }

  if ([...password].length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (
    Buffer.byteLength(password, "utf8") >
    BCRYPT_MAX_BYTES
  ) {
    return `Password must not exceed ${BCRYPT_MAX_BYTES} UTF-8 bytes.`;
  }

  return null;
};

const toSafeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  requestedRole: user.requestedRole || null,
  isActive: user.isActive,
  approvalStatus: user.approvalStatus,
  isEmailVerified: user.isEmailVerified,
});

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const getRequestMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

const writeAuditLog = async ({
  req,
  userId,
  action,
  description,
  entityType = "User",
  entityId,
}) => {
  try {
    await createAuditLog({
      userId,
      action,
      module: "auth",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req),
    });
  } catch (error) {
    logError(
      `Auth ${action} audit logging failed:`,
      error
    );
  }
};

// ======================================================
// Registration
// POST /api/auth/register
//
// Public registration:
// - Accepts only permitted staff roles.
// - Stores the selected role in requestedRole.
// - Keeps actual role as cashier until approval.
// - Never permits public Admin/Super Admin creation.
// ======================================================

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      requestedRole,
    } = req.body || {};

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return sendError(
        res,
        400,
        "First name, last name, email, and password are required."
      );
    }

    if (
      typeof requestedRole !== "string" ||
      !STAFF_ROLES.includes(requestedRole)
    ) {
      return sendError(
        res,
        400,
        "Please select a valid staff role."
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

    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return sendError(res, 400, passwordError);
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return sendError(
        res,
        409,
        "An account with this email already exists. If you have not verified your email, request another verification email."
      );
    }

    const verificationToken =
      generateVerificationToken();

    const user = await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,

      password: await bcrypt.hash(
        password,
        BCRYPT_ROUNDS
      ),

      role: "cashier",
      requestedRole,

      isActive: false,
      approvalStatus: "pending",
      isEmailVerified: false,

      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt:
        getVerificationExpiry(),
    });

    try {
      await sendVerificationEmail({
        email: normalizedEmail,
        firstName: normalizedFirstName,
        token: verificationToken,
      });
    } catch (emailError) {
      logError(
        "Registration verification email failed:",
        emailError
      );

      await writeAuditLog({
        req,
        userId: user.id,
        action: "register_email_failed",
        description:
          `User ${user.id} registered with requested role ${requestedRole}, but the verification email could not be sent.`,
        entityId: user.id,
      });

      return res.status(202).json({
        success: true,
        emailSent: false,
        message:
          "Your account has been created, but we could not send the verification email. Please use the resend verification option.",
      });
    }

    await writeAuditLog({
      req,
      userId: user.id,
      action: "register",
      description:
        `User ${user.id} registered with requested role ${requestedRole} and verification email was sent.`,
      entityId: user.id,
    });

    return res.status(201).json({
      success: true,
      emailSent: true,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    logError("Register error:", error);

    if (
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    return sendError(
      res,
      500,
      "Unable to register user."
    );
  }
};

// ======================================================
// Resend Verification Email
// POST /api/auth/resend-verification
// ======================================================

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return sendError(
        res,
        400,
        "Please provide your email address."
      );
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an eligible account exists, a verification email will be sent.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message:
          "This email address has already been verified.",
      });
    }

    if (user.role === "admin") {
      return res.status(200).json({
        success: true,
        message:
          "Please contact the Super Admin for assistance with your invitation.",
      });
    }

    const verificationToken =
      generateVerificationToken();

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiresAt =
      getVerificationExpiry();

    await user.save();

    try {
      await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
      });
    } catch (emailError) {
      logError(
        "Resend verification email failed:",
        emailError
      );

      await writeAuditLog({
        req,
        userId: user.id,
        action: "resend_verification_failed",
        description:
          `A new verification email could not be sent to user ${user.id}.`,
        entityId: user.id,
      });

      return sendError(
        res,
        503,
        "We could not send the verification email. Please try again later."
      );
    }

    await writeAuditLog({
      req,
      userId: user.id,
      action: "resend_verification",
      description:
        `A new verification email was sent to user ${user.id}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message:
        "A new verification email has been sent. Please check your inbox and spam folder.",
    });
  } catch (error) {
    logError(
      "Resend verification error:",
      error
    );

    return sendError(
      res,
      500,
      "Unable to resend verification email."
    );
  }
};

// ======================================================
// Verify Email
// GET /api/auth/verify-email/:token
// POST /api/auth/verify-email
//
// Token consumption is protected by a database
// transaction and row-level lock.
//
// Ordinary staff applicants:
// 1. Verify their email.
// 2. Remain pending approval.
// 3. Super Admin receives an application notification.
//
// Invited Admins retain their separate password setup flow.
// ======================================================

const verifyEmail = async (req, res) => {
  try {
    const verificationToken =
      req.params?.token || req.body?.token;

    if (
      typeof verificationToken !== "string" ||
      !verificationToken.trim()
    ) {
      return sendError(
        res,
        400,
        "Verification token is required."
      );
    }

    // ==================================================
    // ATOMIC TOKEN VALIDATION AND CONSUMPTION
    // ==================================================

    const verificationResult = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findOne({
          where: {
            emailVerificationToken: verificationToken,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          return {
            error: {
              status: 400,
              message:
                "Invalid or expired verification token.",
            },
          };
        }

        const expiresAt =
          user.emailVerificationExpiresAt;

        if (
          !expiresAt ||
          new Date(expiresAt).getTime() <= Date.now()
        ) {
          return {
            error: {
              status: 400,
              message:
                "Your verification link has expired. Please request a new one.",
            },
          };
        }

        user.isEmailVerified = true;

        // ----------------------------------------------
        // INVITED ADMIN PASSWORD SETUP
        // ----------------------------------------------

        if (
          user.role === "admin" &&
          user.approvalStatus === "approved"
        ) {
          const passwordSetupToken =
            generateVerificationToken();

          user.emailVerificationToken =
            passwordSetupToken;

          user.emailVerificationExpiresAt =
            getVerificationExpiry();

          await user.save({ transaction });

          return {
            type: "admin",
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            passwordSetupToken,
          };
        }

        // ----------------------------------------------
        // ORDINARY STAFF EMAIL VERIFICATION
        // ----------------------------------------------

        user.emailVerificationToken = null;
        user.emailVerificationExpiresAt = null;

        await user.save({ transaction });

        return {
          type: "staff",
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          requestedRole: user.requestedRole,
        };
      }
    );

    // ==================================================
    // HANDLE TRANSACTION RESULT
    // ==================================================

    if (verificationResult.error) {
      return sendError(
        res,
        verificationResult.error.status,
        verificationResult.error.message
      );
    }

    // ==================================================
    // INVITED ADMIN PASSWORD SETUP EMAIL
    // Send only after the transaction commits.
    // ==================================================

    if (verificationResult.type === "admin") {
      try {
        await sendAdminPasswordSetupEmail({
          email: verificationResult.email,
          firstName: verificationResult.firstName,
          token: verificationResult.passwordSetupToken,
        });
      } catch (emailError) {
        logError(
          "Admin password setup email failed:",
          emailError
        );

        await writeAuditLog({
          req,
          userId: verificationResult.userId,
          action: "admin_password_email_failed",
          description:
            `Admin ${verificationResult.userId} verified their email, but the password setup email could not be sent.`,
          entityId: verificationResult.userId,
        });

        return sendError(
          res,
          503,
          "Your email was verified, but the password setup email could not be sent. Contact the Super Admin for a new invitation."
        );
      }

      await writeAuditLog({
        req,
        userId: verificationResult.userId,
        action: "verify_email",
        description:
          `Invited Admin ${verificationResult.userId} verified their email and received a password setup link.`,
        entityId: verificationResult.userId,
      });

      return res.status(200).json({
        success: true,
        message:
          "Email verified successfully. Follow the password setup link sent to your email. Your account will still require Super Admin activation.",
      });
    }

    // ==================================================
    // ORDINARY STAFF AUDIT LOG
    // ==================================================

    await writeAuditLog({
      req,
      userId: verificationResult.userId,
      action: "verify_email",
      description:
        `User ${verificationResult.userId} verified their email address.`,
      entityId: verificationResult.userId,
    });

    // ==================================================
    // NOTIFY SUPER ADMIN ABOUT STAFF APPLICATION
    // ==================================================

    let notificationSent = false;

    if (
      STAFF_ROLES.includes(
        verificationResult.requestedRole
      )
    ) {
      try {
        const superAdmin = await User.findOne({
          where: {
            role: "superadmin",
            isActive: true,
            approvalStatus: "approved",
            isEmailVerified: true,
          },
          attributes: [
            "id",
            "firstName",
            "email",
          ],
        });

        if (!superAdmin) {
          throw new Error(
            "No active, approved and verified Super Admin account was found."
          );
        }

        await sendNewStaffRegistrationNotificationEmail({
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          applicantName:
            `${verificationResult.firstName} ${verificationResult.lastName}`,
          applicantEmail: verificationResult.email,
          requestedRole: verificationResult.requestedRole,
        });

        notificationSent = true;

        await writeAuditLog({
          req,
          userId: verificationResult.userId,
          action: "staff_application_notification_sent",
          description:
            `Super Admin was notified about verified staff application ${verificationResult.userId}, requesting ${verificationResult.requestedRole}.`,
          entityId: verificationResult.userId,
        });
      } catch (notificationError) {
        logError(
          "Super Admin staff notification failed:",
          notificationError
        );

        await writeAuditLog({
          req,
          userId: verificationResult.userId,
          action: "staff_application_notification_failed",
          description:
            `User ${verificationResult.userId} verified their email, but the Super Admin application notification could not be delivered.`,
          entityId: verificationResult.userId,
        });
      }
    }

    return res.status(200).json({
      success: true,
      notificationSent,
      message: notificationSent
        ? "Email verified successfully. Your application is now awaiting administrator approval."
        : "Email verified successfully. Your account is now pending administrator approval.",
    });
  } catch (error) {
    logError("Verify email error:", error);

    return sendError(
      res,
      500,
      "Unable to verify email."
    );
  }
};

// ======================================================
// Set Admin Password
// POST /api/auth/setup-admin-password
//
// The database transaction and row-level lock prevent
// simultaneous reuse of the same password setup token.
// ======================================================

const setupAdminPassword = async (req, res) => {
  try {
    const {
      token,
      password,
      confirmPassword,
    } = req.body || {};

    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof password !== "string" ||
      !password ||
      typeof confirmPassword !== "string" ||
      !confirmPassword
    ) {
      return sendError(
        res,
        400,
        "Password setup token, password and confirmation are required."
      );
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return sendError(res, 400, passwordError);
    }

    if (password !== confirmPassword) {
      return sendError(
        res,
        400,
        "Password and confirmation do not match."
      );
    }

    // ==================================================
    // ATOMIC TOKEN VALIDATION AND PASSWORD SETUP
    // ==================================================

    const setupResult = await sequelize.transaction(
      async (transaction) => {
        const user = await User.findOne({
          where: {
            emailVerificationToken: token,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          return {
            error: {
              status: 400,
              message:
                "Invalid or expired password setup link.",
            },
          };
        }

        const expiresAt =
          user.emailVerificationExpiresAt;

        if (
          !expiresAt ||
          new Date(expiresAt).getTime() <= Date.now()
        ) {
          return {
            error: {
              status: 400,
              message:
                "Your password setup link has expired. Contact the Super Admin for a new invitation.",
            },
          };
        }

        if (
          user.role !== "admin" ||
          user.approvalStatus !== "approved" ||
          !user.isEmailVerified
        ) {
          return {
            error: {
              status: 403,
              message:
                "This password setup link is not valid for this account.",
            },
          };
        }

        if (user.isActive) {
          return {
            error: {
              status: 409,
              message:
                "This Admin account has already been activated.",
            },
          };
        }

        user.password = await bcrypt.hash(
          password,
          BCRYPT_ROUNDS
        );

        user.emailVerificationToken = null;
        user.emailVerificationExpiresAt = null;

        await user.save({ transaction });

        return {
          success: true,
          userId: user.id,
        };
      }
    );

    // ==================================================
    // HANDLE TRANSACTION RESULT
    // ==================================================

    if (setupResult.error) {
      return sendError(
        res,
        setupResult.error.status,
        setupResult.error.message
      );
    }

    // ==================================================
    // AUDIT LOG AFTER SUCCESSFUL COMMIT
    // ==================================================

    await writeAuditLog({
      req,
      userId: setupResult.userId,
      action: "admin_password_setup",
      description:
        `Invited Admin ${setupResult.userId} completed password setup. Account remains inactive pending Super Admin activation.`,
      entityId: setupResult.userId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password set successfully. Your account is waiting for Super Admin activation. You can sign in after your account has been activated.",
    });
  } catch (error) {
    logError(
      "Admin password setup error:",
      error
    );

    return sendError(
      res,
      500,
      "Unable to set Admin password."
    );
  }
};

// ======================================================
// Login
// POST /api/auth/login
// ======================================================

const login = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      logError(
        "Login configuration error:",
        new Error("JWT_SECRET is not configured.")
      );

      return sendError(
        res,
        500,
        "Authentication service is not configured."
      );
    }

    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return sendError(
        res,
        400,
        "Email and password are required."
      );
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    const user = await User.unscoped().findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || !user.password) {
      return sendError(
        res,
        401,
        "Invalid email or password."
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return sendError(
        res,
        401,
        "Invalid email or password."
      );
    }

    if (!user.isEmailVerified) {
      return sendError(
        res,
        403,
        "Please verify your email address before signing in."
      );
    }

    if (user.approvalStatus !== "approved") {
      return sendError(
        res,
        403,
        user.approvalStatus === "pending"
          ? "Your account is awaiting administrator approval."
          : "Your account is not approved. Contact an administrator."
      );
    }

    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account is not active yet. Contact an administrator."
      );
    }

    const token = generateToken(user);

    await writeAuditLog({
      req,
      userId: user.id,
      action: "login",
      description:
        `User ${user.id} logged in successfully.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Login error:", error);

    return sendError(
      res,
      500,
      "Unable to login."
    );
  }
};

// ======================================================
// Update Profile
// PUT /api/auth/profile
// ======================================================

const updateProfile = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return sendError(
        res,
        401,
        "Invalid authenticated user."
      );
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return sendError(
        res,
        404,
        "User account not found."
      );
    }

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

    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    if (normalizedEmail !== user.email) {
      return sendError(
        res,
        400,
        "Email changes are unavailable until email verification is set up. Contact an administrator."
      );
    }

    const changedFields = [];

    if (user.firstName !== normalizedFirstName) {
      user.firstName = normalizedFirstName;
      changedFields.push("first name");
    }

    if (user.lastName !== normalizedLastName) {
      user.lastName = normalizedLastName;
      changedFields.push("last name");
    }

    if (changedFields.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No profile changes were made.",
        user: toSafeUser(user),
      });
    }

    await user.save();

    await writeAuditLog({
      req,
      userId: user.id,
      action: "update",
      description:
        `Profile updated. Changed fields: ${changedFields.join(", ")}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    logError("Profile update error:", error);

    if (
      error.name === "SequelizeValidationError"
    ) {
      return sendError(
        res,
        400,
        "The profile details are invalid."
      );
    }

    return sendError(
      res,
      500,
      "Unable to update profile."
    );
  }
};

// ======================================================
// Change Password
// PUT /api/auth/password
// ======================================================

const changePassword = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return sendError(
        res,
        401,
        "Invalid authenticated user."
      );
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      !newPassword ||
      typeof confirmPassword !== "string" ||
      !confirmPassword
    ) {
      return sendError(
        res,
        400,
        "Current password, new password and confirmation are required."
      );
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return sendError(
        res,
        400,
        passwordError.replace(
          /^Password/,
          "New password"
        )
      );
    }

    if (newPassword !== confirmPassword) {
      return sendError(
        res,
        400,
        "New password and confirmation do not match."
      );
    }

    const user = await User.unscoped().findByPk(userId);

    if (!user) {
      return sendError(
        res,
        404,
        "User account not found."
      );
    }

    if (!user.password) {
      return sendError(
        res,
        500,
        "Unable to verify the current password."
      );
    }

    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!currentPasswordMatches) {
      return sendError(
        res,
        401,
        "Current password is incorrect."
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return sendError(
        res,
        400,
        "New password must be different from your current password."
      );
    }

    user.password = await bcrypt.hash(
      newPassword,
      BCRYPT_ROUNDS
    );

    await user.save();

    await writeAuditLog({
      req,
      userId: user.id,
      action: "update",
      description:
        `Password changed for user ${user.id}.`,
      entityId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    logError("Change password error:", error);

    return sendError(
      res,
      500,
      "Unable to change password."
    );
  }
};

// ======================================================
// Exports
// ======================================================

module.exports = {
  register,
  resendVerificationEmail,
  verifyEmail,
  setupAdminPassword,
  login,
  updateProfile,
  changePassword,
};
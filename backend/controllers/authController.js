
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User } = require("../models");
const { createAuditLog } = require("../services/auditLogService");

// ======================================================
// Constants
// ======================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const BCRYPT_ROUNDS = 12;

// ======================================================
// Logging Helper
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

// ======================================================
// HTTP Error Response
// ======================================================

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message
  });

// ======================================================
// Request Metadata
// ======================================================

const getRequestMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")
});

// ======================================================
// Safe User Response
// Never return the password hash.
// ======================================================

const toSafeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  isActive: user.isActive
});

// ======================================================
// Generate JWT
// ======================================================

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );
};

// ======================================================
// Audit Logging
// ======================================================

const writeAuditLog = async ({
  req,
  userId,
  action,
  description,
  entityType = "User",
  entityId
}) => {
  try {
    await createAuditLog({
      userId,
      action,
      module: "auth",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req)
    });
  } catch (auditError) {
    // An audit logging failure should not expose internal details
    // or unnecessarily prevent the authentication operation.
    console.error(
      `Auth ${action} audit error:`,
      auditError.message
    );
  }
};

// ======================================================
// Normalize Email
// ======================================================

const normalizeEmail = (email) =>
  email.trim().toLowerCase();

// ======================================================
// Validate Email
// ======================================================

const isValidEmail = (email) =>
  typeof email === "string" &&
  EMAIL_PATTERN.test(email);

// ======================================================
// Validate Password
// ======================================================

const validatePassword = (password) => {
  if (typeof password !== "string") {
    return "Password is required.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return null;
};

// ======================================================
// Register User
// POST /api/auth/register
//
// Public registration creates cashier accounts only.
// The role supplied by the client is never trusted.
// ======================================================

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password
    } = req.body || {};

    // Validate required fields.
    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password
    ) {
      return sendError(
        res,
        400,
        "First name, last name, email and password are required."
      );
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = normalizeEmail(email);

    // Validate name lengths.
    if (
      normalizedFirstName.length > 100 ||
      normalizedLastName.length > 100
    ) {
      return sendError(
        res,
        400,
        "First name and last name must not exceed 100 characters."
      );
    }

    // Validate email format.
    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    // Validate password.
    const passwordError = validatePassword(password);

    if (passwordError) {
      return sendError(res, 400, passwordError);
    }

    // Check for duplicate email.
    const existingUser = await User.findOne({
      where: {
        email: normalizedEmail
      }
    });

    if (existingUser) {
      return sendError(
        res,
        409,
        "A user with this email already exists."
      );
    }

    // Hash the password before storing it.
    const hashedPassword = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    // IMPORTANT:
    // Never use req.body.role for public registration.
    const user = await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "cashier"
    });

    // Record account creation.
    await writeAuditLog({
      req,
      userId: user.id,
      action: "create",
      description:
        `User account created for ${user.firstName} ${user.lastName}.`,
      entityId: user.id
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now sign in.",
      user: toSafeUser(user)
    });
  } catch (error) {
    logError("Registration error:", error);

    // Handle duplicate email conflicts.
    if (error.name === "SequelizeUniqueConstraintError") {
      return sendError(
        res,
        409,
        "A user with this email already exists."
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
// Login User
// POST /api/auth/login
// ======================================================

const login = async (req, res) => {
  try {
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

    // The withPassword scope must include the password field.
    const user = await User.scope("withPassword").findOne({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return sendError(
        res,
        401,
        "Invalid email or password."
      );
    }

    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account has been deactivated."
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return sendError(
        res,
        401,
        "Invalid email or password."
      );
    }

    const token = generateToken(user);

    await writeAuditLog({
      req,
      userId: user.id,
      action: "login",
      description:
        `${user.firstName} ${user.lastName} logged in successfully.`,
      entityId: user.id
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: toSafeUser(user)
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
// Requires authentication.
// ======================================================

const updateProfile = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
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
      email
    } = req.body || {};

    if (
      typeof firstName !== "string" ||
      !firstName.trim()
    ) {
      return sendError(
        res,
        400,
        "First name is required."
      );
    }

    if (
      typeof lastName !== "string" ||
      !lastName.trim()
    ) {
      return sendError(
        res,
        400,
        "Last name is required."
      );
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return sendError(
        res,
        400,
        "Email is required."
      );
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedFirstName.length > 100 ||
      normalizedLastName.length > 100
    ) {
      return sendError(
        res,
        400,
        "First name and last name must not exceed 100 characters."
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        400,
        "Please provide a valid email address."
      );
    }

    // Check if another account already uses this email.
    const existingUser = await User.findOne({
      where: {
        email: normalizedEmail
      }
    });

    if (
      existingUser &&
      Number(existingUser.id) !== Number(user.id)
    ) {
      return sendError(
        res,
        409,
        "A user with this email already exists."
      );
    }

    const changedFields = [];

    if (user.firstName !== normalizedFirstName) {
      changedFields.push("first name");
    }

    if (user.lastName !== normalizedLastName) {
      changedFields.push("last name");
    }

    if (user.email !== normalizedEmail) {
      changedFields.push("email");
    }

    user.firstName = normalizedFirstName;
    user.lastName = normalizedLastName;
    user.email = normalizedEmail;

    await user.save();

    if (changedFields.length > 0) {
      await writeAuditLog({
        req,
        userId: user.id,
        action: "update",
        description:
          `User profile updated. Changed fields: ${changedFields.join(", ")}.`,
        entityId: user.id
      });
    }

    return res.status(200).json({
      success: true,
      message:
        changedFields.length > 0
          ? "Profile updated successfully."
          : "No profile changes were made.",
      user: toSafeUser(user)
    });
  } catch (error) {
    logError("Profile update error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return sendError(
        res,
        409,
        "A user with this email already exists."
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
// Requires authentication.
// ======================================================

const changePassword = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return sendError(
        res,
        401,
        "Invalid authenticated user."
      );
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword
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

    const user = await User.scope("withPassword").findByPk(
      userId
    );

    if (!user) {
      return sendError(
        res,
        404,
        "User account not found."
      );
    }

    const currentPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!currentPasswordMatch) {
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
        `Password changed successfully for ${user.firstName} ${user.lastName}.`,
      entityId: user.id
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully."
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
// Export Controllers
// ======================================================

module.exports = {
  register,
  login,
  updateProfile,
  changePassword
};
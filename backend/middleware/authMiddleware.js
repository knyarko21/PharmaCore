
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// ======================================================
// CONFIGURATION
// ======================================================

const VALID_ROLES = [
  "superadmin",
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement",
];

// ======================================================
// HELPERS
// ======================================================

const logError = (context, error) => {
  console.error("================================");
  console.error(context);
  console.error(error);
  console.error("================================");
};

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

// ======================================================
// AUTHENTICATE USER
// ======================================================

const authenticate = async (req, res, next) => {
  try {
    // 1. Check JWT configuration

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return sendError(
        res,
        500,
        "Authentication service is not configured."
      );
    }

    // 2. Read Authorization header

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(
        res,
        401,
        "Authentication required."
      );
    }

    const parts = authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer" ||
      !parts[1]
    ) {
      return sendError(
        res,
        401,
        "Invalid authentication format."
      );
    }

    const token = parts[1];

    // 3. Verify JWT
    // Explicitly accept only HS256-signed tokens.

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    // 4. Validate JWT user ID

    const userId = Number(decoded?.id);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return sendError(
        res,
        401,
        "Invalid authentication token."
      );
    }

    // 5. Load current user from database
    // Database remains the source of truth.

    const user = await User.findByPk(userId);

    if (!user) {
      return sendError(
        res,
        401,
        "User account not found."
      );
    }

    // 6. Validate user role

    if (!VALID_ROLES.includes(user.role)) {
      console.error(
        `Invalid role detected for user ID ${user.id}:`,
        user.role
      );

      return sendError(
        res,
        403,
        "Your account has an invalid role. Contact an administrator."
      );
    }

    // 7. Check email verification

    if (!user.isEmailVerified) {
      return sendError(
        res,
        403,
        "Please verify your email address before accessing this resource."
      );
    }

    // 8. Check account activation

    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account has been deactivated."
      );
    }

    // 9. Check administrator approval

    if (user.approvalStatus !== "approved") {
      return sendError(
        res,
        403,
        user.approvalStatus === "pending"
          ? "Your account is awaiting administrator approval."
          : "Your account is not approved. Contact an administrator."
      );
    }

    // 10. Attach safe user information to request

    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      isEmailVerified: user.isEmailVerified,
    };

    // 11. Continue to protected route

    return next();

  } catch (error) {

    // 12. Handle JWT errors

    if (error.name === "TokenExpiredError") {
      return sendError(
        res,
        401,
        "Your session has expired. Please sign in again."
      );
    }

    if (error.name === "JsonWebTokenError") {
      return sendError(
        res,
        401,
        "Invalid authentication token."
      );
    }

    if (error.name === "NotBeforeError") {
      return sendError(
        res,
        401,
        "Authentication token is not active yet."
      );
    }

    // 13. Handle unexpected errors

    logError("Authentication error:", error);

    return sendError(
      res,
      500,
      "Unable to authenticate user."
    );
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  authenticate,
};
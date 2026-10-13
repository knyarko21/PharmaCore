
const jwt = require("jsonwebtoken");

const { User } = require("../models");

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

// ======================================================
// Authenticate User
// ======================================================
//
// Verifies the JWT in the Authorization header, loads the
// matching user, checks that the account is active, and
// attaches a safe user object to req.user.
//
// Attaches on success:
//   req.user = { id, firstName, lastName, email, role, isActive }
//
// Failure statuses:
//   500 - JWT_SECRET not configured
//   401 - Missing / malformed / invalid / expired token
//   401 - User account not found
//   403 - User account deactivated
// ======================================================

const authenticate = async (req, res, next) => {
  try {
    // ----------------------------------------------
    // Configuration check
    // ----------------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return sendError(
        res,
        500,
        "Authentication service is not configured."
      );
    }

    // ----------------------------------------------
    // Authorization header
    // ----------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 401, "Authentication required.");
    }

    const parts = authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer"
    ) {
      return sendError(
        res,
        401,
        "Invalid authentication format."
      );
    }

    const token = parts[1];

    if (!token) {
      return sendError(
        res,
        401,
        "Authentication token is missing."
      );
    }

    // ----------------------------------------------
    // Verify token
    // ----------------------------------------------

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !decoded ||
      !decoded.id ||
      !Number.isInteger(Number(decoded.id))
    ) {
      return sendError(
        res,
        401,
        "Invalid authentication token."
      );
    }

    // ----------------------------------------------
    // Load user
    // ----------------------------------------------

    const user = await User.findByPk(Number(decoded.id));

    if (!user) {
      return sendError(res, 401, "User account not found.");
    }

    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account has been deactivated."
      );
    }

    // ----------------------------------------------
    // Attach safe user info
    // ----------------------------------------------

    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    return next();
  } catch (error) {
    logError("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return sendError(
        res,
        401,
        "Authentication token has expired."
      );
    }

    if (error.name === "JsonWebTokenError") {
      return sendError(
        res,
        401,
        "Invalid authentication token."
      );
    }

    return sendError(res, 500, "Unable to authenticate user.");
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  authenticate
};

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

const authenticate = async (req, res, next) => {
  try {
    // 1. Verify authentication configuration
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

    // 3. Verify JWT
    const decoded = jwt.verify(
      parts[1],
      process.env.JWT_SECRET
    );

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

    // 4. Always load the current database user.
    // Never rely on a potentially outdated JWT role.
    const user = await User.findByPk(Number(decoded.id));

    if (!user) {
      return sendError(
        res,
        401,
        "User account not found."
      );
    }

    // 5. Check account activation
    if (!user.isActive) {
      return sendError(
        res,
        403,
        "Your account has been deactivated."
      );
    }

    // 6. Check administrator approval
    if (user.approvalStatus !== "approved") {
      if (user.approvalStatus === "rejected") {
        return sendError(
          res,
          403,
          "Your registration was not approved. Please contact the administrator."
        );
      }

      return sendError(
        res,
        403,
        "Your account is awaiting administrator approval."
      );
    }

    // 7. Attach current, safe database user information
    req.user = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus
    };

    return next();
  } catch (error) {
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

    logError("Authentication error:", error);

    return sendError(
      res,
      500,
      "Unable to authenticate user."
    );
  }
};

module.exports = {
  authenticate
};
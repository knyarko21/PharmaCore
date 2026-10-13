
// ======================================================
// Authorize by Role
// ======================================================
//
// Must be used AFTER authenticate middleware, so req.user
// is populated. Returns 401 if authentication didn't run,
// and 403 if the user's role is not in the allowed list.
//
// Usage:
//   router.post("/medicines", authenticate, authorize("admin"), handler);
//   router.get("/sales", authenticate, authorize("admin", "cashier"), handler);
// ======================================================

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action."
      });
    }

    return next();
  };
};

// ======================================================
// Export
// ======================================================

module.exports = {
  authorize
};
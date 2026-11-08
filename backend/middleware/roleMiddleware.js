
// ======================================================
// Role Authorization Middleware
// ======================================================

// Super Admin inherits all System Admin permissions.
// System Admin does not inherit Super Admin permissions.

const ROLE_HIERARCHY = {
  superadmin: ["superadmin", "admin"],
  admin: ["admin"],
  pharmacist: ["pharmacist"],
  cashier: ["cashier"],
  inventory_manager: ["inventory_manager"],
  procurement: ["procurement"],
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userRole = req.user.role;

    const inheritedRoles = ROLE_HIERARCHY[userRole] || [];

    const hasPermission = allowedRoles.some((role) =>
      inheritedRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
};

module.exports = {
  authorize,
};
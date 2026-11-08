
const express = require("express");

const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Audit Log Routes
// Restricted to admin and superadmin
// ======================================================

// GET /api/audit-logs
router.get(
  "/",
  authenticate,
  authorize("admin"),
  getAuditLogs
);

// GET /api/audit-logs/:id
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  getAuditLogById
);

// ======================================================
// Export
// ======================================================

module.exports = router;
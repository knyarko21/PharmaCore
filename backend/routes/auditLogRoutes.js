
const express = require("express");

const {
  getAuditLogs,
  getAuditLogById
} = require("../controllers/auditLogController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================
//
// GET /api/audit-logs      list audit logs (paginated)
// GET /api/audit-logs/:id  fetch one audit log
//
// Restricted to admin only.
// ======================================================

router.get("/", authenticate, authorize("admin"), getAuditLogs);

router.get("/:id", authenticate, authorize("admin"), getAuditLogById);

module.exports = router;
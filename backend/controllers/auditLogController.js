
const auditLogService = require("../services/auditLogService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const isNotFoundError = (error) =>
  error?.message === "Audit log not found." ||
  error?.code === "AUDIT_LOG_NOT_FOUND";

// ======================================================
// Get Audit Logs
// ======================================================
//
// GET /api/audit-logs
//
// Query params:
//   - page    (number, optional)
//   - limit   (number, optional)
//   - action  (string, optional)
//   - module  (string, optional)
//   - userId  (number, optional)
//
// Response:
//   {
//     success: true,
//     results: {
//       logs: [...],
//       pagination: { page, limit, total, totalPages }
//     }
//   }
// ======================================================

const getAuditLogs = async (req, res) => {
  try {
    const { page, limit, action, module, userId } = req.query;

    const results = await auditLogService.getAuditLogs({
      page,
      limit,
      action,
      module,
      userId
    });

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    logError("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit logs.",
      error: error.message
    });
  }
};

// ======================================================
// Get Audit Log By ID
// ======================================================
//
// GET /api/audit-logs/:id
//
// Response:
//   {
//     success: true,
//     auditLog: { ... }
//   }
// ======================================================

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await auditLogService.getAuditLogById(id);

    return res.status(200).json({
      success: true,
      auditLog
    });
  } catch (error) {
    logError("Get audit log by ID error:", error);

    if (isNotFoundError(error)) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit log.",
      error: error.message
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getAuditLogs,
  getAuditLogById
};
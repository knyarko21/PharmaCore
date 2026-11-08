
const auditLogService = require("../services/auditLogService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("================================");
  console.error(context);
  console.error(error);
  console.error("================================");
};

const isNotFoundError = (error) =>
  error?.message === "Audit log not found." ||
  error?.code === "AUDIT_LOG_NOT_FOUND";

const parsePositiveInteger = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

// ======================================================
// Get Audit Logs
// GET /api/audit-logs
// ======================================================

const getAuditLogs = async (req, res) => {
  try {
    const {
      page,
      limit,
      action,
      module,
      userId,
    } = req.query;

    const safePage = parsePositiveInteger(page, 1, 1000000);
    const safeLimit = parsePositiveInteger(limit, 12, 500);

    const offset = (safePage - 1) * safeLimit;

    const result = await auditLogService.getAuditLogs({
      limit: safeLimit,
      offset,
      action,
      module,
      userId,
    });

    const total = Number(result.count) || 0;

    const totalPages = Math.ceil(total / safeLimit);

    return res.status(200).json({
      success: true,
      results: {
        logs: result.rows,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(totalPages, 1),
        },
      },
    });
  } catch (error) {
    logError("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit logs.",
      error: error.message,
    });
  }
};

// ======================================================
// Get Audit Log By ID
// GET /api/audit-logs/:id
// ======================================================

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await auditLogService.getAuditLogById(id);

    return res.status(200).json({
      success: true,
      auditLog,
    });
  } catch (error) {
    logError("Get audit log by ID error:", error);

    if (isNotFoundError(error)) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found.",
      });
    }

    if (error.message?.startsWith("Invalid audit log")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to fetch audit log.",
      error: error.message,
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getAuditLogs,
  getAuditLogById,
};

const { AuditLog, User } = require("../models");

// ======================================================
// Helpers
// ======================================================

const toPositiveInteger = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const toTrimmedString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

// ======================================================
// Create Audit Log
// ======================================================
//
// Called by controllers and services across the app. Never
// throws to the caller — audit failures should not break
// the primary action. Returns the created log, or null if
// validation fails.
//
// Note: callers wrap this in try/catch today, so it's safe
// to throw — but we validate first to keep the DB clean.
// ======================================================

const createAuditLog = async ({
  userId,
  action,
  module,
  description,
  entityType = null,
  entityId = null,
  ipAddress = null,
  userAgent = null
}) => {
  const numericUserId = toPositiveInteger(userId);

  if (!numericUserId) {
    throw new Error(
      "A valid user ID is required to create an audit log."
    );
  }

  const normalizedAction = toTrimmedString(action);
  const normalizedModule = toTrimmedString(module);
  const normalizedDescription = toTrimmedString(description);

  if (!normalizedAction) throw new Error("Audit action is required.");
  if (!normalizedModule) throw new Error("Audit module is required.");
  if (!normalizedDescription) throw new Error("Audit description is required.");

  const user = await User.findByPk(numericUserId);

  if (!user) {
    throw new Error("User performing this action was not found.");
  }

  return AuditLog.create({
    userId: numericUserId,
    action: normalizedAction.toLowerCase(),
    module: normalizedModule.toLowerCase(),
    description: normalizedDescription,
    entityType: toTrimmedString(entityType),
    entityId: entityId != null ? Number(entityId) : null,
    ipAddress: toTrimmedString(ipAddress),
    userAgent: toTrimmedString(userAgent)
  });
};

// ======================================================
// Get Audit Logs (paginated)
// ======================================================

const getAuditLogs = async ({
  page = 1,
  limit = 20,
  action = null,
  module = null,
  userId = null
} = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (currentPage - 1) * pageSize;

  const where = {};

  const actionFilter = toTrimmedString(action);
  if (actionFilter) where.action = actionFilter.toLowerCase();

  const moduleFilter = toTrimmedString(module);
  if (moduleFilter) where.module = moduleFilter.toLowerCase();

  const userIdFilter = toPositiveInteger(userId);
  if (userIdFilter) where.userId = userIdFilter;

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "role"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset
  });

  const logs = rows.map((log) => ({
    id: log.id,
    action: log.action,
    module: log.module,
    description: log.description,
    entityType: log.entityType,
    entityId: log.entityId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    user: log.user
      ? {
          id: log.user.id,
          name: `${log.user.firstName} ${log.user.lastName}`,
          email: log.user.email,
          role: log.user.role
        }
      : null
  }));

  return {
    logs,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize)
    }
  };
};

// ======================================================
// Get Audit Log By ID
// ======================================================

const getAuditLogById = async (auditLogId) => {
  const numericId = toPositiveInteger(auditLogId);

  if (!numericId) {
    throw new Error("Invalid audit log ID.");
  }

  const auditLog = await AuditLog.findByPk(numericId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "role"]
      }
    ]
  });

  if (!auditLog) {
    throw new Error("Audit log not found.");
  }

  return auditLog;
};

module.exports = {
  createAuditLog,
  getAuditLogs,
  getAuditLogById
};
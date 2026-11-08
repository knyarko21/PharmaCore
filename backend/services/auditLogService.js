
const { AuditLog } = require("../models");
const { Op } = require("sequelize");

// ======================================================
// Audit Log Service
// ======================================================

// ======================================================
// Helpers
// ======================================================

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeOptionalText = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return normalizeText(String(value)) || null;
};

const normalizeId = (value, fieldName) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid audit log ${fieldName}.`);
  }

  return id;
};

const normalizePagination = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
};

// ======================================================
// Normalize Audit Input
// ======================================================

const normalizeAuditData = (data = {}) => {
  const userId = normalizeId(data.userId, "user ID");

  const action = normalizeText(data.action);

  const module = normalizeText(
    data.module || data.entity || "general"
  );

  const description = normalizeText(
    data.description || data.details
  );

  const entityType = normalizeOptionalText(
    data.entityType || data.entity
  );

  let entityId = null;

  if (
    data.entityId !== undefined &&
    data.entityId !== null
  ) {
    entityId = normalizeId(data.entityId, "entity ID");
  }

  if (!action) {
    throw new Error("Audit log action is required.");
  }

  if (action.length > 100) {
    throw new Error(
      "Audit log action cannot exceed 100 characters."
    );
  }

  if (!module) {
    throw new Error("Audit log module is required.");
  }

  if (module.length > 50) {
    throw new Error(
      "Audit log module cannot exceed 50 characters."
    );
  }

  if (!description) {
    throw new Error("Audit log description is required.");
  }

  return {
    userId,
    action,
    module,
    description,
    entityType,
    entityId,
    ipAddress: normalizeOptionalText(data.ipAddress),
    userAgent: normalizeOptionalText(data.userAgent),
  };
};

// ======================================================
// Create Audit Log
// ======================================================

const createAuditLog = async (data) => {
  try {
    const auditData = normalizeAuditData(data);

    const auditLog = await AuditLog.create(auditData);

    return auditLog;
  } catch (error) {
    console.error("Audit log creation failed:", error);

    // Audit failure must not interrupt an already
    // completed business operation.
    return null;
  }
};

// ======================================================
// Get Audit Logs
// ======================================================

const getAuditLogs = async ({
  userId,
  action,
  module,
  entityType,
  entityId,
  limit = 100,
  offset = 0,
} = {}) => {
  const where = {};

  if (userId !== undefined && userId !== "") {
    where.userId = normalizeId(userId, "user ID");
  }

  if (action) {
    where.action = normalizeText(action);
  }

  if (module) {
    where.module = normalizeText(module);
  }

  if (entityType) {
    where.entityType = normalizeText(entityType);
  }

  if (entityId !== undefined && entityId !== null) {
    where.entityId = normalizeId(entityId, "entity ID");
  }

  const safeLimit = Math.min(
    Math.max(Number.parseInt(limit, 10) || 100, 1),
    500
  );

  const safeOffset = Math.max(
    Number.parseInt(offset, 10) || 0,
    0
  );

  return AuditLog.findAndCountAll({
    where,
    limit: safeLimit,
    offset: safeOffset,
    order: [["createdAt", "DESC"]],
    distinct: true,
    include: [
      {
        association: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "role",
        ],
        required: false,
      },
    ],
  });
};

// ======================================================
// Get Audit Log By ID
// ======================================================

const getAuditLogById = async (id) => {
  const auditLogId = normalizeId(id, "ID");

  const auditLog = await AuditLog.findByPk(auditLogId, {
    include: [
      {
        association: "user",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "role",
        ],
        required: false,
      },
    ],
  });

  if (!auditLog) {
    const error = new Error("Audit log not found.");
    error.code = "AUDIT_LOG_NOT_FOUND";
    throw error;
  }

  return auditLog;
};

// ======================================================
// Export
// ======================================================

module.exports = {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
};

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// AuditLog Model
// ======================================================
//
// Append-only trail of actions performed in the system.
// Written by controllers via auditLogService — never
// updated, never deleted by application code.
//
// `action` is a constrained enum so queries and badges
// on the frontend can rely on a fixed set of values.
// ======================================================

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    action: {
      type: DataTypes.ENUM(
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "sale",
        "purchase",
        "dispense",
        "stock_adjustment"
      ),
      allowNull: false
    },

    module: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      }
    }
  },
  {
    tableName: "audit_logs",
    timestamps: true
  }
);

module.exports = AuditLog;
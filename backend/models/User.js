
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    // =========================================
    // Primary Key
    // =========================================
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // =========================================
    // Personal Information
    // =========================================
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      set(value) {
        this.setDataValue(
          "email",
          typeof value === "string"
            ? value.trim().toLowerCase()
            : value
        );
      },
    },

    // =========================================
    // Authentication
    // =========================================
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // =========================================
    // User Role
    // =========================================
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "cashier",
    },

    // Retained for compatibility with existing
    // accounts and the previous registration flow.
    // New invitations assign the actual role directly.
    requestedRole: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      validate: {
        isIn: [
          [
            "pharmacist",
            "cashier",
            "inventory_manager",
            "procurement",
          ],
        ],
      },
    },

    // =========================================
    // Account Status
    // =========================================
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    approvalStatus: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected"
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    // =========================================
    // Existing Email Verification
    // Retained for existing accounts and
    // backward compatibility.
    // =========================================
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },

    emailVerificationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // =========================================
    // New Invitation System
    // =========================================

    // SHA-256 hash of the invitation token.
    // The original token is never stored.
    invitationTokenHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },

    // Invitation expiration timestamp.
    invitationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // User ID of the Admin or Super Admin
    // who created the invitation.
    invitedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Records successful invitation acceptance.
    invitationAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },

  {
    tableName: "users",
    timestamps: true,

    // =========================================
    // Default Scope
    // Never expose passwords in ordinary queries.
    // =========================================
    defaultScope: {
      attributes: {
        exclude: ["password"],
      },
    },

    // =========================================
    // Authentication Scope
    // Explicitly retrieve passwords when needed.
    // =========================================
    scopes: {
      withPassword: {
        attributes: {
          exclude: [],
        },
      },
    },
  }
);

module.exports = User;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    // ==========================================
    // Primary Key
    // ==========================================
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ==========================================
    // Personal Information
    // ==========================================
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

    // ==========================================
    // Authentication
    // ==========================================
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ==========================================
    // User Role
    // ==========================================
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "cashier",
    },

    // ==========================================
    // Requested Staff Role
    //
    // Stores the role selected during public
    // registration.
    //
    // This does NOT grant permissions.
    // The actual role is assigned after approval.
    // ==========================================
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

    // ==========================================
    // Account Status
    // ==========================================
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

    // ==========================================
    // Email Verification
    // ==========================================
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
  },

  {
    tableName: "users",
    timestamps: true,

    // ==========================================
    // Default Scope
    // Never expose passwords in ordinary queries.
    // ==========================================
    defaultScope: {
      attributes: {
        exclude: ["password"],
      },
    },

    // ==========================================
    // Authentication Scope
    // Explicitly retrieve the password when needed.
    // ==========================================
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
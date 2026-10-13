
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Setting Model
// ======================================================
//
// Per-user application settings. One row per user
// (enforced by the unique constraint on `userId`).
//
// Defaults reflect the app's dark-mode, GHS-currency,
// DD/MM/YYYY baseline so a brand new user gets a
// working configuration immediately.
// ======================================================

const Setting = sequelize.define(
  "Setting",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "users",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    },

    pharmacyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "PharmaCore Pharmacy"
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    address: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    lowStockAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    expiryAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    purchaseAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "GHS"
    },

    dateFormat: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "DD/MM/YYYY"
    },

    theme: {
      type: DataTypes.ENUM("Dark", "Light", "System"),
      allowNull: false,
      defaultValue: "Dark"
    }
  },
  {
    tableName: "settings",
    timestamps: true
  }
);

module.exports = Setting;
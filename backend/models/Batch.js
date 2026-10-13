
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Batch Model
// ======================================================
//
// Stock is tracked per batch so the pharmacy can enforce
// FEFO (First-Expired-First-Out) dispensing. Each batch
// belongs to one medicine and (optionally) one supplier.
//
// `quantity` is decremented as sales happen.
// `expiryDate` drives the expiring / expired alerts.
// ======================================================

const Batch = sequelize.define(
  "Batch",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    batchNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },

    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    manufactureDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    medicineId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "medicines",
        key: "id"
      }
    },

    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "suppliers",
        key: "id"
      }
    }
  },
  {
    tableName: "batches",
    timestamps: true
  }
);

module.exports = Batch;
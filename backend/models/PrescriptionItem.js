
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// PrescriptionItem Model
// ======================================================
//
// Line item on a prescription. Tracks how much has been
// dispensed so far via `dispensedQuantity`. The sale flow
// increments this field whenever an item is sold against
// a prescription.
//
// Remaining quantity = quantity - dispensedQuantity
// ======================================================

const PrescriptionItem = sequelize.define(
  "PrescriptionItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    dosage: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    frequency: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    duration: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },

    dispensedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },

    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "prescriptions",
        key: "id"
      }
    },

    medicineId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "medicines",
        key: "id"
      }
    }
  },
  {
    tableName: "prescription_items",
    timestamps: true
  }
);

module.exports = PrescriptionItem;
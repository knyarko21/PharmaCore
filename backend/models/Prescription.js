
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Prescription Model
// ======================================================
//
// Header for a prescription. Line items live in
// PrescriptionItem. Status transitions:
//
//   active → partially_dispensed → dispensed
//   active → cancelled
//
// Once any item has been dispensed (partially or fully),
// the prescription cannot be cancelled.
// ======================================================

const Prescription = sequelize.define(
  "Prescription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    prescriptionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    prescriptionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    doctorName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    doctorLicenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    status: {
      type: DataTypes.ENUM(
        "active",
        "partially_dispensed",
        "dispensed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "active"
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "customers",
        key: "id"
      }
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      }
    }
  },
  {
    tableName: "prescriptions",
    timestamps: true
  }
);

module.exports = Prescription;
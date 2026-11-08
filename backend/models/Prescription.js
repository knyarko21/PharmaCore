
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Prescription = sequelize.define(
  "Prescription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    prescriptionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    prescriptionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Link to a registered doctor.
    // Nullable to preserve existing prescriptions.
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "doctors",
        key: "id",
      },
    },

    // Retained for compatibility with existing records
    // and any existing frontend or service code.
    doctorName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    doctorLicenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "active",
        "partially_dispensed",
        "dispensed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "active",
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "customers",
        key: "id",
      },
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "prescriptions",
    timestamps: true,
  }
);

module.exports = Prescription;
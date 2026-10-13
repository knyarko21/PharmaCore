
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Customer Model
// ======================================================
//
// Pharmacy patients / walk-ins who have been registered.
// Soft-deleted via `isActive`. Emergency contact fields
// are optional and displayed in the customer details modal.
// ======================================================

const Customer = sequelize.define(
  "Customer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },

    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: true
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    emergencyContactName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    emergencyContactPhone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "customers",
    timestamps: true
  }
);

module.exports = Customer;
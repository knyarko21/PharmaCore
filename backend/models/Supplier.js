
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Supplier Model
// ======================================================
//
// Vendors that supply medicines. Soft-deleted via
// `isActive`. `licenseNumber` is unique per the schema.
// ======================================================

const Supplier = sequelize.define(
  "Supplier",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    contactPerson: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: false
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "suppliers",
    timestamps: true
  }
);

module.exports = Supplier;
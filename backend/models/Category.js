
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Category Model
// ======================================================
//
// Groups medicines into therapeutic / business categories.
// Soft-deleted via `isActive` rather than row deletion.
// ======================================================

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "categories",
    timestamps: true
  }
);

module.exports = Category;
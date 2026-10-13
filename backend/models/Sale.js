
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Sale Model
// ======================================================
//
// Header for a completed sale. Line items live in
// SaleItem. Payments live in Payment.
//
// Totals:
//   subtotal      sum of line totals
//   discount      discount applied to the sale
//   tax           tax applied to the sale
//   totalAmount   subtotal - discount + tax
//
// Status flow:
//   completed → refunded | partially_refunded
//   completed → cancelled
// ======================================================

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    saleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    saleDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    tax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    status: {
      type: DataTypes.ENUM(
        "completed",
        "cancelled",
        "refunded",
        "partially_refunded"
      ),
      allowNull: false,
      defaultValue: "completed"
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    tableName: "sales",
    timestamps: true
  }
);

module.exports = Sale;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Payment Model
// ======================================================
//
// One row per payment attempt against a sale. A sale can
// have multiple payments (e.g. partial cash + partial card),
// so this is a 1:N relationship with Sale.
//
// `paymentReference` is a system-generated unique string.
// `transactionReference` is the external reference the
// customer sees on their receipt (Momo / card / bank).
// ======================================================

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },

    paymentMethod: {
      type: DataTypes.ENUM(
        "cash",
        "mobile_money",
        "card",
        "bank_transfer"
      ),
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "completed",
        "failed",
        "refunded"
      ),
      allowNull: false,
      defaultValue: "completed"
    },

    transactionReference: {
      type: DataTypes.STRING(150),
      allowNull: true
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    saleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sales",
        key: "id"
      }
    }
  },
  {
    tableName: "payments",
    timestamps: true
  }
);

module.exports = Payment;
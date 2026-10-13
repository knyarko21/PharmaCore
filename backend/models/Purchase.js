
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// Purchase Model
// ======================================================
//
// Header row for a purchase order. Line items live in
// PurchaseItem. `totalAmount` is the sum of line totals
// and is populated when the purchase is created.
//
// Status flow:
//   pending → received   (via receivePurchase)
//   pending → cancelled  (via cancelPurchase)
//   received is terminal; received purchases cannot be cancelled.
// ======================================================

const Purchase = sequelize.define(
  "Purchase",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    purchaseNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    status: {
      type: DataTypes.ENUM("pending", "received", "cancelled"),
      allowNull: false,
      defaultValue: "pending"
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "suppliers",
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
    tableName: "purchases",
    timestamps: true
  }
);

module.exports = Purchase;
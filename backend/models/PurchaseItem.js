
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// PurchaseItem Model
// ======================================================
//
// Line item on a purchase order. `totalPrice` is
// `quantity * unitPrice` and is set by the service when
// the purchase is created (not computed at read time).
// ======================================================

const PurchaseItem = sequelize.define(
  "PurchaseItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },

    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },

    purchaseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "purchases",
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
    tableName: "purchase_items",
    timestamps: true
  }
);

module.exports = PurchaseItem;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// SaleItem Model
// ======================================================
//
// Line item on a sale. Each line is tied to a specific
// batch so FEFO dispensing is recorded correctly.
//
// `prescriptionItemId` is set when the medicine required
// a prescription; NULL means the medicine was sold OTC
// without a prescription.
// ======================================================

const SaleItem = sequelize.define(
  "SaleItem",
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

    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },

    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },

    saleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sales",
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
    },

    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "batches",
        key: "id"
      }
    },

    prescriptionItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "prescription_items",
        key: "id"
      }
    }
  },
  {
    tableName: "sale_items",
    timestamps: true
  }
);

module.exports = SaleItem;
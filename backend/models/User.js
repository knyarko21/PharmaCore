

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM(
        "admin",
        "pharmacist",
        "cashier",
        "inventory_manager",
        "procurement"
      ),
      allowNull: false,
      defaultValue: "cashier",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    approvalStatus: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "rejected"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "users",
    timestamps: true,

    defaultScope: {
      attributes: {
        exclude: ["password"],
      },
    },

    scopes: {
      withPassword: {
        attributes: {
          include: ["password"],
        },
      },
    },
  }
);

module.exports = User;

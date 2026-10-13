
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// ======================================================
// User Model
// ======================================================
//
// Default scope excludes the password field. Use the
// "withPassword" scope when you explicitly need to read
// or compare the hash (e.g. login, password change).
//
//   User.findOne(...)                          // no password
//   User.scope("withPassword").findOne(...)    // includes password
// ======================================================

const User = sequelize.define(
  "User",
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

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },

    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    role: {
      type: DataTypes.ENUM(
        "admin",
        "pharmacist",
        "cashier",
        "inventory_manager"
      ),
      allowNull: false,
      defaultValue: "cashier"
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "users",
    timestamps: true,

    defaultScope: {
      attributes: {
        exclude: ["password"]
      }
    },

    scopes: {
      withPassword: {
        attributes: {
          include: ["password"]
        }
      }
    }
  }
);

module.exports = User;
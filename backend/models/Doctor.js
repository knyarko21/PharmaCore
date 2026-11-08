
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Doctor = sequelize.define(
  "Doctor",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    doctorCode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },

    fullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    // Official licence number: entered and verified separately.
    licenseNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },

    specialization: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    facility: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "doctors",
    timestamps: true,

    hooks: {
      afterCreate: async (doctor, options) => {
        if (!doctor.doctorCode) {
          const doctorCode = `DOC-${String(doctor.id).padStart(6, "0")}`;

          await doctor.update(
            { doctorCode },
            { transaction: options.transaction }
          );
        }
      },
    },
  }
);

module.exports = Doctor;
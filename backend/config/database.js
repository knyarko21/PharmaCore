
const { Sequelize } = require("sequelize");
require("dotenv").config();

const requiredVariables = [
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD"
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing database environment variables: ${missingVariables.join(", ")}`
  );
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,

    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },

    retry: {
      max: 2
    },

    dialectOptions: {
      connectTimeout: 10000
    }
  }
);

module.exports = sequelize;
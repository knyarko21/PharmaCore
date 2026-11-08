
const crypto = require("crypto");

const generateVerificationToken = () =>
  crypto.randomBytes(32).toString("hex");

const getVerificationExpiry = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
module.exports = {
  generateVerificationToken,
  getVerificationExpiry,
};
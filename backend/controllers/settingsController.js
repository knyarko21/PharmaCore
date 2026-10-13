
const { Setting } = require("../models");

// ======================================================
// Constants
// ======================================================

const ALLOWED_FIELDS = [
  "pharmacyName",
  "email",
  "phone",
  "address",
  "lowStockAlerts",
  "expiryAlerts",
  "purchaseAlerts",
  "currency",
  "dateFormat",
  "theme"
];

const BOOLEAN_FIELDS = [
  "lowStockAlerts",
  "expiryAlerts",
  "purchaseAlerts"
];

const VALID_CURRENCIES = ["GHS", "USD", "NGN"];
const VALID_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const VALID_THEMES = ["Dark", "Light", "System"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    message
  });

// Copy only the fields we allow, so unknown body keys are
// silently ignored instead of accidentally persisted.
const pickAllowedUpdates = (body) => {
  const updates = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  return updates;
};

// Validate the incoming preference values. Returns an error
// message string, or null when the payload is valid.
const validateUpdates = (updates) => {
  if (
    updates.currency !== undefined &&
    !VALID_CURRENCIES.includes(updates.currency)
  ) {
    return "Unsupported currency";
  }

  if (
    updates.dateFormat !== undefined &&
    !VALID_DATE_FORMATS.includes(updates.dateFormat)
  ) {
    return "Unsupported date format";
  }

  if (
    updates.theme !== undefined &&
    !VALID_THEMES.includes(updates.theme)
  ) {
    return "Unsupported theme";
  }

  for (const field of BOOLEAN_FIELDS) {
    if (
      updates[field] !== undefined &&
      typeof updates[field] !== "boolean"
    ) {
      return `${field} must be true or false`;
    }
  }

  if (
    updates.email !== undefined &&
    updates.email !== null &&
    updates.email !== "" &&
    !EMAIL_PATTERN.test(updates.email)
  ) {
    return "Please provide a valid email address";
  }

  return null;
};

// Find the current user's settings row, creating it if missing.
const findOrCreateSettings = async (userId) => {
  let settings = await Setting.findOne({ where: { userId } });

  if (!settings) {
    settings = await Setting.create({ userId });
  }

  return settings;
};

// ======================================================
// Get Settings
// ======================================================
//
// GET /api/settings
//
// Response:
//   { success: true, message, settings }
// ======================================================

const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await findOrCreateSettings(userId);

    return res.status(200).json({
      success: true,
      message: "Settings retrieved successfully",
      settings
    });
  } catch (error) {
    logError("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve settings"
    });
  }
};

// ======================================================
// Update Settings
// ======================================================
//
// PUT /api/settings
//
// Response:
//   { success: true, message, settings }
// ======================================================

const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = pickAllowedUpdates(req.body);

    if (Object.keys(updates).length === 0) {
      return sendValidationError(res, "No valid settings provided");
    }

    const validationError = validateUpdates(updates);

    if (validationError) {
      return sendValidationError(res, validationError);
    }

    const settings = await findOrCreateSettings(userId);

    const savedSettings = await settings.update(updates);

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: savedSettings
    });
  } catch (error) {
    logError("Update settings error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Some settings are invalid"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update settings"
    });
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getSettings,
  updateSettings
};
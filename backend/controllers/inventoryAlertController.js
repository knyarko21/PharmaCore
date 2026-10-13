
const inventoryAlertService = require("../services/inventoryAlertService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

// ======================================================
// Get Inventory Alerts
// ======================================================
//
// GET /api/inventory-alerts
//
// Response:
//   { success: true, results }
// ======================================================

const getInventoryAlerts = async (req, res) => {
  try {
    const results = await inventoryAlertService.getInventoryAlerts();

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    logError("Get inventory alerts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inventory alerts.",
      error: error.message
    });
  }
};

module.exports = {
  getInventoryAlerts
};
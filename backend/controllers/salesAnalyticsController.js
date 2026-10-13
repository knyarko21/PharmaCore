
const salesAnalyticsService = require("../services/salesAnalyticsService");

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
// Get Sales Analytics
// ======================================================
//
// GET /api/sales-analytics
//
// Response:
//   { success: true, analytics }
// ======================================================

const getSalesAnalytics = async (req, res) => {
  try {
    const analytics = await salesAnalyticsService.getSalesAnalytics();

    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    logError("Get sales analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch sales analytics.",
      error: error.message
    });
  }
};

module.exports = {
  getSalesAnalytics
};

const dashboardService = require("../services/dashboardService");

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
// Get Dashboard Overview
// ======================================================
//
// GET /api/dashboard/overview
//
// Response:
//   { success: true, dashboard }
// ======================================================

const getDashboardOverview = async (req, res) => {
  try {
    const dashboard = await dashboardService.getDashboardOverview();

    return res.status(200).json({
      success: true,
      dashboard
    });
  } catch (error) {
    logError("Get dashboard overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard overview.",
      error: error.message
    });
  }
};

module.exports = {
  getDashboardOverview
};
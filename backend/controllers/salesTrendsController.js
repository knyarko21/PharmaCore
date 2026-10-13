
const salesTrendsService = require("../services/salesTrendsService");

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
// Get Sales Trends
// ======================================================
//
// GET /api/sales-trends
//
// Response:
//   {
//     success: true,
//     period: { startDate, endDate },
//     trends: [...],
//     summary: {...}
//   }
// ======================================================

const getSalesTrends = async (req, res) => {
  try {
    const days = req.query.days;
    const result = await salesTrendsService.getSalesTrends({ days });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logError("Get sales trends error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch sales trends.",
      error: error.message
    });
  }
};

module.exports = {
  getSalesTrends
};
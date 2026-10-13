
const salesAnalyticsService = require("../services/salesAnalyticsService");
const salesTrendsService = require("../services/salesTrendsService");
const topSellingService = require("../services/topSellingService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendError = (res, error, fallbackMessage, status = 500) =>
  res.status(error?.statusCode || status).json({
    success: false,
    message: error?.message || fallbackMessage,
    error: error?.message
  });

// ======================================================
// Get Sales Analytics
// ======================================================
//
// GET /api/analytics/sales
//
// Response:
//   {
//     success: true,
//     analytics: {
//       today: { revenue, cost, profit, profitMargin, unitsSold, salesCount },
//       month: { revenue, cost, profit, profitMargin, unitsSold, salesCount }
//     }
//   }
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

    return sendError(res, error, "Unable to fetch sales analytics.");
  }
};

// ======================================================
// Get Sales Trends
// ======================================================
//
// GET /api/analytics/trends
//
// Response:
//   {
//     success: true,
//     period: { startDate, endDate },
//     trends: [{ date, revenue, cost, profit, salesCount }],
//     summary: { revenue, cost, profit, profitMargin, unitsSold }
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

    return sendError(res, error, "Unable to fetch sales trends.");
  }
};

// ======================================================
// Get Top Selling
// ======================================================
//
// GET /api/analytics/top-selling
//
// Response:
//   {
//     success: true,
//     today: [{ medicineId, name, sku, unitsSold, revenue, cost, profit, profitMargin }],
//     month: [...]
//   }
// ======================================================

const getTopSelling = async (req, res) => {
  try {
    const limit = req.query.limit;
    const result = await topSellingService.getTopSellingMedicines({ limit });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logError("Get top selling error:", error);

    return sendError(res, error, "Unable to fetch top-selling medicines.");
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  getSalesAnalytics,
  getSalesTrends,
  getTopSelling
};
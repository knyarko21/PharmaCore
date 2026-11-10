
const salesAnalyticsService = require("../services/salesAnalyticsService");
const salesTrendsService = require("../services/salesTrendsService");
const topSellingService = require("../services/topSellingService");

const logError = (context, error) => {
  console.error("================================");
  console.error(context);
  console.error(error);
  console.error("================================");
};

const sendError = (res, error, fallbackMessage, status = 500) =>
  res.status(error?.statusCode || status).json({
    success: false,
    message: error?.message || fallbackMessage,
    error: error?.message,
  });

// ======================================================
// Cashier Financial Data Protection
// ======================================================

const isCashier = (req) =>
  String(req.user?.role || "").trim().toLowerCase() === "cashier";

const filterCashierPeriod = (period = {}) => ({
  revenue: period.revenue,
  unitsSold: period.unitsSold,
  salesCount: period.salesCount,
});

const filterCashierTrend = (trend = {}) => ({
  date: trend.date,
  revenue: trend.revenue,
  unitsSold: trend.unitsSold,
  salesCount: trend.salesCount,
});

const filterCashierMedicine = (medicine = {}) => ({
  medicineId: medicine.medicineId,
  name: medicine.name,
  sku: medicine.sku,
  unitsSold: medicine.unitsSold,
  revenue: medicine.revenue,
});

// ======================================================
// Sales Analytics
// ======================================================

const getSalesAnalytics = async (req, res) => {
  try {
    const analytics = await salesAnalyticsService.getSalesAnalytics();

    if (isCashier(req)) {
      return res.status(200).json({
        success: true,
        analytics: {
          today: filterCashierPeriod(analytics?.today),
          month: filterCashierPeriod(analytics?.month),
        },
      });
    }

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    logError("Get sales analytics error:", error);
    return sendError(
      res,
      error,
      "Unable to fetch sales analytics."
    );
  }
};

// ======================================================
// Sales Trends
// ======================================================

const getSalesTrends = async (req, res) => {
  try {
    const days = req.query.days;

    const result = await salesTrendsService.getSalesTrends({ days });

    if (isCashier(req)) {
      return res.status(200).json({
        success: true,
        period: result?.period || {},
        summary: filterCashierPeriod(result?.summary),
        trends: (result?.trends || []).map(filterCashierTrend),
      });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logError("Get sales trends error:", error);
    return sendError(
      res,
      error,
      "Unable to fetch sales trends."
    );
  }
};

// ======================================================
// Top-selling Medicines
// ======================================================

const getTopSelling = async (req, res) => {
  try {
    const limit = req.query.limit;

    const result = await topSellingService.getTopSellingMedicines({
      limit,
    });

    if (isCashier(req)) {
      return res.status(200).json({
        success: true,
        today: (result?.today || []).map(filterCashierMedicine),
        month: (result?.month || []).map(filterCashierMedicine),
      });
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logError("Get top selling error:", error);
    return sendError(
      res,
      error,
      "Unable to fetch top-selling medicines."
    );
  }
};

module.exports = {
  getSalesAnalytics,
  getSalesTrends,
  getTopSelling,
};
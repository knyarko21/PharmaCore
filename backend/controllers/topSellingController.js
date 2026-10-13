
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

// ======================================================
// Get Top Selling Medicines
// ======================================================
//
// GET /api/top-selling
//
// Response:
//   {
//     success: true,
//     today: [...],
//     month: [...]
//   }
// ======================================================

const getTopSellingMedicines = async (req, res) => {
  try {
    const limit = req.query.limit;
    const result = await topSellingService.getTopSellingMedicines({ limit });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logError("Get top selling medicines error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch top selling medicines.",
      error: error.message
    });
  }
};

module.exports = {
  getTopSellingMedicines
};
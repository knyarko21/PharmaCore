
const inventoryService = require("../services/inventoryService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const getRequestMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")
});

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Get Inventory Summary
// GET /api/inventory/summary
// ======================================================

const getInventorySummary = async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary();

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    logError("Get inventory summary error:", error);

    return sendError(res, error, "Unable to fetch inventory summary.");
  }
};

// ======================================================
// Get Low Stock Medicines
// GET /api/inventory/low-stock
// ======================================================

const getLowStockMedicines = async (req, res) => {
  try {
    const medicines = await inventoryService.getLowStockMedicines();

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    logError("Get low stock error:", error);

    return sendError(res, error, "Unable to fetch low stock medicines.");
  }
};

// ======================================================
// Get Expiring Batches
// GET /api/inventory/expiring?days=90
// ======================================================

const getExpiringBatches = async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 90;

    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return sendError(
        res,
        {
          statusCode: 400,
          message: "Days must be a whole number between 1 and 3650."
        },
        "Invalid days parameter."
      );
    }

    const batches = await inventoryService.getExpiringBatches(days);

    return res.status(200).json({
      success: true,
      days,
      count: batches.length,
      batches
    });
  } catch (error) {
    logError("Get expiring batches error:", error);

    return sendError(res, error, "Unable to fetch expiring batches.");
  }
};

// ======================================================
// Get Expired Batches
// GET /api/inventory/expired
// ======================================================

const getExpiredBatches = async (req, res) => {
  try {
    const batches = await inventoryService.getExpiredBatches();

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    logError("Get expired batches error:", error);

    return sendError(res, error, "Unable to fetch expired batches.");
  }
};

// ======================================================
// Get Stock By Medicine
// GET /api/inventory/stock/:medicineId
// ======================================================

const getStockByMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;

    if (
      !Number.isInteger(Number(medicineId)) ||
      Number(medicineId) <= 0
    ) {
      return sendError(
        res,
        {
          statusCode: 400,
          message: "Medicine ID must be a positive whole number."
        },
        "Invalid medicine ID."
      );
    }

    const stock = await inventoryService.getStockByMedicine(medicineId);

    return res.status(200).json({
      success: true,
      stock
    });
  } catch (error) {
    logError("Get medicine stock error:", error);

    return sendError(res, error, "Unable to fetch medicine stock.");
  }
};

// ======================================================
// Adjust Stock
// POST /api/inventory/adjust
// ======================================================

const adjustStock = async (req, res) => {
  try {
    const adjustment = await inventoryService.adjustStock(
      req.body,
      req.user.id,
      getRequestMeta(req)
    );

    return res.status(200).json({
      success: true,
      message: "Stock adjusted successfully.",
      ...adjustment
    });
  } catch (error) {
    logError("Adjust stock error:", error);

    return sendError(res, error, "Unable to adjust stock.");
  }
};

module.exports = {
  getInventorySummary,
  getLowStockMedicines,
  getExpiringBatches,
  getExpiredBatches,
  getStockByMedicine,
  adjustStock
};
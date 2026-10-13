
const saleService = require("../services/saleService");
const { generateReceiptPdf } = require("../services/receiptService");

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
// Create Sale
// ======================================================
//
// POST /api/sales
//
// Response:
//   { success: true, message, sale }
// ======================================================

const createSale = async (req, res) => {
  try {
    const sale = await saleService.createSale(
      req.body,
      req.user.id,
      getRequestMeta(req)
    );

    return res.status(201).json({
      success: true,
      message: "Sale created successfully.",
      sale
    });
  } catch (error) {
    logError("Create sale error:", error);

    return sendError(res, error, "Failed to create sale.");
  }
};

// ======================================================
// Get All Sales
// ======================================================
//
// GET /api/sales
//
// Response:
//   { success: true, sales }
// ======================================================

const getAllSales = async (req, res) => {
  try {
    const sales = await saleService.getAllSales();

    return res.status(200).json({
      success: true,
      sales
    });
  } catch (error) {
    logError("Get all sales error:", error);

    return sendError(res, error, "Failed to retrieve sales.");
  }
};

// ======================================================
// Get Sale By ID
// ======================================================
//
// GET /api/sales/:id
//
// Response:
//   { success: true, sale }
// ======================================================

const getSaleById = async (req, res) => {
  try {
    const sale = await saleService.getSaleById(req.params.id);

    return res.status(200).json({
      success: true,
      sale
    });
  } catch (error) {
    logError("Get sale error:", error);

    return sendError(res, error, "Failed to retrieve sale.");
  }
};

// ======================================================
// Cancel Sale
// ======================================================
//
// DELETE /api/sales/:id
//
// Response:
//   { success: true, message, sale }
// ======================================================

const cancelSale = async (req, res) => {
  try {
    const sale = await saleService.cancelSale(
      req.params.id,
      req.user.id,
      getRequestMeta(req)
    );

    return res.status(200).json({
      success: true,
      message: "Sale cancelled successfully and inventory restored.",
      sale
    });
  } catch (error) {
    logError("Cancel sale error:", error);

    return sendError(res, error, "Failed to cancel sale.");
  }
};

// ======================================================
// Download Sale Receipt (PDF)
// ======================================================
//
// GET /api/sales/:id/receipt
//
// Streams a PDF receipt directly to the response.
// ======================================================

const getSaleReceipt = async (req, res) => {
  try {
    const sale = await saleService.getSaleById(req.params.id);

    const filename = `receipt-${sale.saleNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await generateReceiptPdf({ sale, stream: res });
  } catch (error) {
    logError("Get sale receipt error:", error);

    if (!res.headersSent) {
      return sendError(res, error, "Failed to generate receipt.");
    }
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale,
  getSaleReceipt
};
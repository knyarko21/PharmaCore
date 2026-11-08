
const saleService = require("../services/saleService");
const { generateReceiptPdf } = require("../services/receiptService");

// ======================================================
// HELPERS
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const getRequestMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });

// ======================================================
// CREATE SALE
// POST /api/sales
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
      sale,
    });
  } catch (error) {
    logError("Create sale error:", error);

    return sendError(res, error, "Failed to create sale.");
  }
};

// ======================================================
// GET ALL SALES
// GET /api/sales
// ======================================================
//
// Cashiers receive only sales they personally created.
// Other permitted roles receive the complete sales list.
// ======================================================

const getAllSales = async (req, res) => {
  try {
    const sales = await saleService.getAllSales(req.user);

    return res.status(200).json({
      success: true,
      sales,
    });
  } catch (error) {
    logError("Get sales error:", error);

    return sendError(res, error, "Failed to retrieve sales.");
  }
};

// ======================================================
// GET SALE BY ID
// GET /api/sales/:id
// ======================================================
//
// The service checks whether the requesting user owns
// the sale when the requester is a cashier.
// ======================================================

const getSaleById = async (req, res) => {
  try {
    const sale = await saleService.getSaleById(
      req.params.id,
      req.user
    );

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    logError("Get sale error:", error);

    return sendError(res, error, "Failed to retrieve sale.");
  }
};

// ======================================================
// CANCEL SALE
// DELETE /api/sales/:id
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
      sale,
    });
  } catch (error) {
    logError("Cancel sale error:", error);

    return sendError(res, error, "Failed to cancel sale.");
  }
};

// ======================================================
// DOWNLOAD SALE RECEIPT
// GET /api/sales/:id/receipt
// ======================================================
//
// Cashiers can download only receipts belonging to
// sales they personally processed.
// ======================================================

const getSaleReceipt = async (req, res) => {
  try {
    const sale = await saleService.getSaleById(
      req.params.id,
      req.user
    );

    const filename = `receipt-${sale.saleNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await generateReceiptPdf({
      sale,
      stream: res,
    });
  } catch (error) {
    logError("Get sale receipt error:", error);

    if (!res.headersSent) {
      return sendError(
        res,
        error,
        "Failed to generate receipt."
      );
    }
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale,
  getSaleReceipt,
};

const purchaseService = require("../services/purchaseService");

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
// Create Purchase
// ======================================================

const createPurchase = async (req, res) => {
  try {
    const purchase = await purchaseService.createPurchase(
      req.body,
      req.user.id,
      getRequestMeta(req)
    );

    return res.status(201).json({
      success: true,
      message: "Purchase created successfully.",
      purchase
    });
  } catch (error) {
    logError("Create purchase error:", error);

    return sendError(res, error, "Unable to create purchase.");
  }
};

// ======================================================
// Get All Purchases
// ======================================================

const getAllPurchases = async (req, res) => {
  try {
    const purchases = await purchaseService.getAllPurchases();

    return res.status(200).json({
      success: true,
      count: purchases.length,
      purchases
    });
  } catch (error) {
    logError("Get purchases error:", error);

    return sendError(res, error, "Unable to fetch purchases.");
  }
};

// ======================================================
// Get Purchase By ID
// ======================================================

const getPurchaseById = async (req, res) => {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);

    return res.status(200).json({
      success: true,
      purchase
    });
  } catch (error) {
    logError("Get purchase error:", error);

    return sendError(res, error, "Unable to fetch purchase.");
  }
};

// ======================================================
// Update Purchase
// ======================================================

const updatePurchase = async (req, res) => {
  try {
    const purchase = await purchaseService.updatePurchase(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Purchase updated successfully.",
      purchase
    });
  } catch (error) {
    logError("Update purchase error:", error);

    return sendError(res, error, "Unable to update purchase.");
  }
};

// ======================================================
// Cancel Purchase
// ======================================================

const cancelPurchase = async (req, res) => {
  try {
    const purchase = await purchaseService.cancelPurchase(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully.",
      purchase
    });
  } catch (error) {
    logError("Cancel purchase error:", error);

    return sendError(res, error, "Unable to cancel purchase.");
  }
};

// ======================================================
// Receive Purchase
// ======================================================

const receivePurchase = async (req, res) => {
  try {
    const purchase = await purchaseService.receivePurchase(
      req.params.id,
      req.body,
      req.user.id,
      getRequestMeta(req)
    );

    return res.status(200).json({
      success: true,
      message: "Purchase received successfully.",
      purchase
    });
  } catch (error) {
    logError("Receive purchase error:", error);

    return sendError(res, error, "Unable to receive purchase.");
  }
};

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase
};
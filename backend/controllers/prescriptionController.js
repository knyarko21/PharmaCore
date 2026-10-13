
const {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionSummary,
  getPrescriptionById,
  getPrescriptionItems,
  cancelPrescription
} = require("../services/prescriptionService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ======================================================
// Create Prescription
// POST /api/prescriptions
// ======================================================

const createPrescriptionHandler = async (req, res) => {
  try {
    const prescription = await createPrescription(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully.",
      prescription
    });
  } catch (error) {
    logError("Create prescription error:", error);

    return sendError(res, error, "Failed to create prescription.");
  }
};

// ======================================================
// Get All Prescriptions
// GET /api/prescriptions
// ======================================================

const getAllPrescriptionsHandler = async (req, res) => {
  try {
    const { search, status, startDate, endDate, page, limit } = req.query;

    if (startDate && !DATE_PATTERN.test(startDate)) {
      return sendError(
        res,
        { statusCode: 400, message: "startDate must use YYYY-MM-DD format." },
        "Invalid startDate."
      );
    }

    if (endDate && !DATE_PATTERN.test(endDate)) {
      return sendError(
        res,
        { statusCode: 400, message: "endDate must use YYYY-MM-DD format." },
        "Invalid endDate."
      );
    }

    if (startDate && endDate && startDate > endDate) {
      return sendError(
        res,
        {
          statusCode: 400,
          message: "startDate cannot be later than endDate."
        },
        "Invalid date range."
      );
    }

    if (search !== undefined && typeof search !== "string") {
      return sendError(
        res,
        { statusCode: 400, message: "search must be a string." },
        "Invalid search."
      );
    }

    const result = await getAllPrescriptions({
      search,
      status,
      startDate,
      endDate,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      count: result.prescriptions.length,
      prescriptions: result.prescriptions,
      pagination: result.pagination
    });
  } catch (error) {
    logError("Get prescriptions error:", error);

    return sendError(res, error, "Failed to fetch prescriptions.");
  }
};

// ======================================================
// Get Prescription Summary
// GET /api/prescriptions/summary
// ======================================================

const getPrescriptionSummaryHandler = async (req, res) => {
  try {
    const summary = await getPrescriptionSummary();

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    logError("Get prescription summary error:", error);

    return sendError(res, error, "Failed to fetch prescription summary.");
  }
};

// ======================================================
// Get One Prescription
// GET /api/prescriptions/:id
// ======================================================

const getPrescriptionByIdHandler = async (req, res) => {
  try {
    const prescription = await getPrescriptionById(req.params.id);

    return res.status(200).json({
      success: true,
      prescription
    });
  } catch (error) {
    logError("Get prescription error:", error);

    return sendError(res, error, "Failed to fetch prescription.");
  }
};

// ======================================================
// Get Prescription Items
// GET /api/prescriptions/:id/items
// ======================================================

const getPrescriptionItemsHandler = async (req, res) => {
  try {
    const items = await getPrescriptionItems(req.params.id);

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    logError("Get prescription items error:", error);

    return sendError(res, error, "Failed to fetch prescription items.");
  }
};

// ======================================================
// Cancel Prescription
// DELETE /api/prescriptions/:id
// ======================================================

const cancelPrescriptionHandler = async (req, res) => {
  try {
    const prescription = await cancelPrescription(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully.",
      prescription
    });
  } catch (error) {
    logError("Cancel prescription error:", error);

    return sendError(res, error, "Failed to cancel prescription.");
  }
};

module.exports = {
  createPrescription: createPrescriptionHandler,
  getAllPrescriptions: getAllPrescriptionsHandler,
  getPrescriptionSummary: getPrescriptionSummaryHandler,
  getPrescriptionById: getPrescriptionByIdHandler,
  getPrescriptionItems: getPrescriptionItemsHandler,
  cancelPrescription: cancelPrescriptionHandler
};
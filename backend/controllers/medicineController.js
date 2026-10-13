
const medicineService = require("../services/medicineService");
const { createAuditLog } = require("../services/auditLogService");

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

const writeAuditLog = async ({
  req,
  action,
  description,
  entityType,
  entityId
}) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      action,
      module: "medicines",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req)
    });
  } catch (auditError) {
    console.error(
      `Medicine ${action} audit error:`,
      auditError.message
    );
  }
};

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Create Medicine
// POST /api/medicines
// ======================================================

const createMedicine = async (req, res) => {
  try {
    const medicine = await medicineService.createMedicine(req.body);

    await writeAuditLog({
      req,
      action: "create",
      description: `Medicine "${medicine.name}" was created.`,
      entityType: "Medicine",
      entityId: medicine.id
    });

    return res.status(201).json({
      success: true,
      message: "Medicine created successfully.",
      medicine
    });
  } catch (error) {
    logError("Create medicine error:", error);

    return sendError(res, error, "Unable to create medicine.");
  }
};

// ======================================================
// Get All Medicines
// GET /api/medicines
// ======================================================

const getAllMedicines = async (req, res) => {
  try {
    const medicines = await medicineService.getAllMedicines();

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    logError("Get medicines error:", error);

    return sendError(res, error, "Unable to fetch medicines.");
  }
};

// ======================================================
// Get Medicine By ID
// GET /api/medicines/:id
// ======================================================

const getMedicineById = async (req, res) => {
  try {
    const medicine = await medicineService.getMedicineById(req.params.id);

    return res.status(200).json({
      success: true,
      medicine
    });
  } catch (error) {
    logError("Get medicine error:", error);

    return sendError(res, error, "Unable to fetch medicine.");
  }
};

// ======================================================
// Update Medicine
// PUT /api/medicines/:id
// ======================================================

const updateMedicine = async (req, res) => {
  try {
    const medicine = await medicineService.updateMedicine(
      req.params.id,
      req.body
    );

    await writeAuditLog({
      req,
      action: "update",
      description: `Medicine "${medicine.name}" was updated.`,
      entityType: "Medicine",
      entityId: medicine.id
    });

    return res.status(200).json({
      success: true,
      message: "Medicine updated successfully.",
      medicine
    });
  } catch (error) {
    logError("Update medicine error:", error);

    return sendError(res, error, "Unable to update medicine.");
  }
};

// ======================================================
// Deactivate Medicine
// DELETE /api/medicines/:id
// ======================================================

const deactivateMedicine = async (req, res) => {
  try {
    const medicine = await medicineService.deactivateMedicine(req.params.id);

    await writeAuditLog({
      req,
      action: "delete",
      description: `Medicine "${medicine.name}" was deactivated.`,
      entityType: "Medicine",
      entityId: medicine.id
    });

    return res.status(200).json({
      success: true,
      message: "Medicine deactivated successfully."
    });
  } catch (error) {
    logError("Deactivate medicine error:", error);

    return sendError(res, error, "Unable to deactivate medicine.");
  }
};

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deactivateMedicine
};
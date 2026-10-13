
const batchService = require("../services/batchService");
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
      module: "batches",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req)
    });
  } catch (auditError) {
    console.error(`Batch ${action} audit error:`, auditError.message);
  }
};

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Create Batch
// POST /api/batches
// ======================================================

const createBatch = async (req, res) => {
  try {
    const batch = await batchService.createBatch(req.body);

    await writeAuditLog({
      req,
      action: "create",
      description: `Batch "${batch.batchNumber}" was created.`,
      entityType: "Batch",
      entityId: batch.id
    });

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      batch
    });
  } catch (error) {
    logError("Create batch error:", error);

    return sendError(res, error, "Unable to create batch.");
  }
};

// ======================================================
// Get All Batches
// GET /api/batches
// ======================================================

const getAllBatches = async (req, res) => {
  try {
    const batches = await batchService.getAllBatches();

    return res.status(200).json({
      success: true,
      count: batches.length,
      batches
    });
  } catch (error) {
    logError("Get batches error:", error);

    return sendError(res, error, "Unable to fetch batches.");
  }
};

// ======================================================
// Get Batch By ID
// GET /api/batches/:id
// ======================================================

const getBatchById = async (req, res) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);

    return res.status(200).json({
      success: true,
      batch
    });
  } catch (error) {
    logError("Get batch error:", error);

    return sendError(res, error, "Unable to fetch batch.");
  }
};

// ======================================================
// Update Batch
// PUT /api/batches/:id
// ======================================================

const updateBatch = async (req, res) => {
  try {
    const batch = await batchService.updateBatch(req.params.id, req.body);

    await writeAuditLog({
      req,
      action: "update",
      description: `Batch "${batch.batchNumber}" was updated.`,
      entityType: "Batch",
      entityId: batch.id
    });

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      batch
    });
  } catch (error) {
    logError("Update batch error:", error);

    return sendError(res, error, "Unable to update batch.");
  }
};

// ======================================================
// Delete Batch
// DELETE /api/batches/:id
// ======================================================

const deleteBatch = async (req, res) => {
  try {
    const deletedBatch = await batchService.deleteBatch(req.params.id);

    await writeAuditLog({
      req,
      action: "delete",
      description: `Batch "${deletedBatch.batchNumber}" was deleted.`,
      entityType: "Batch",
      entityId: deletedBatch.id
    });

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully."
    });
  } catch (error) {
    logError("Delete batch error:", error);

    return sendError(res, error, "Unable to delete batch.");
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch
};
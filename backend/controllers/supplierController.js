
const supplierService = require("../services/supplierService");

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

// Extract the client IP + user agent once so every handler
// doesn't repeat the same two lines.
const getRequestMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent")
});

// Fire-and-forget audit log wrapper. Audit failures never
// break the main response — they only log to the console.
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
      module: "suppliers",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req)
    });
  } catch (auditError) {
    console.error(
      `Supplier ${action} audit error:`,
      auditError.message
    );
  }
};

// Consistent error response builder — falls back to 500 and a
// generic message when the service doesn't provide one.
const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Create Supplier
// ======================================================
//
// POST /api/suppliers
//
// Response:
//   { success: true, message, supplier }
// ======================================================

const createSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);

    await writeAuditLog({
      req,
      action: "create",
      description: `Supplier "${supplier.name}" was created.`,
      entityType: "Supplier",
      entityId: supplier.id
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      supplier
    });
  } catch (error) {
    logError("Create supplier error:", error);

    return sendError(res, error, "Unable to create supplier.");
  }
};

// ======================================================
// Get All Suppliers
// ======================================================
//
// GET /api/suppliers
//
// Response:
//   { success: true, count, suppliers }
// ======================================================

const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierService.getAllSuppliers();

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers
    });
  } catch (error) {
    logError("Get suppliers error:", error);

    return sendError(res, error, "Unable to fetch suppliers.");
  }
};

// ======================================================
// Get Supplier By ID
// ======================================================
//
// GET /api/suppliers/:id
//
// Response:
//   { success: true, supplier }
// ======================================================

const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await supplierService.getSupplierById(id);

    return res.status(200).json({
      success: true,
      supplier
    });
  } catch (error) {
    logError("Get supplier error:", error);

    return sendError(res, error, "Unable to fetch supplier.");
  }
};

// ======================================================
// Update Supplier
// ======================================================
//
// PUT /api/suppliers/:id
//
// Response:
//   { success: true, message, supplier }
// ======================================================

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await supplierService.updateSupplier(id, req.body);

    await writeAuditLog({
      req,
      action: "update",
      description: `Supplier "${supplier.name}" was updated.`,
      entityType: "Supplier",
      entityId: supplier.id
    });

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      supplier
    });
  } catch (error) {
    logError("Update supplier error:", error);

    return sendError(res, error, "Unable to update supplier.");
  }
};

// ======================================================
// Deactivate Supplier
// ======================================================
//
// DELETE /api/suppliers/:id
//
// Response:
//   { success: true, message }
// ======================================================

const deactivateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await supplierService.deactivateSupplier(id);

    await writeAuditLog({
      req,
      action: "delete",
      description: `Supplier "${supplier.name}" was deactivated.`,
      entityType: "Supplier",
      entityId: supplier.id
    });

    return res.status(200).json({
      success: true,
      message: "Supplier deactivated successfully."
    });
  } catch (error) {
    logError("Deactivate supplier error:", error);

    return sendError(res, error, "Unable to deactivate supplier.");
  }
};

// ======================================================
// Export
// ======================================================

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier
};
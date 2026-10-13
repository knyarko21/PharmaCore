
const categoryService = require("../services/categoryService");
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
      module: "categories",
      description,
      entityType,
      entityId,
      ...getRequestMeta(req)
    });
  } catch (auditError) {
    console.error(`Category ${action} audit error:`, auditError.message);
  }
};

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Create Category
// POST /api/categories
// ======================================================

const createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);

    await writeAuditLog({
      req,
      action: "create",
      description: `Category "${category.name}" was created.`,
      entityType: "Category",
      entityId: category.id
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      category
    });
  } catch (error) {
    logError("Create category error:", error);

    return sendError(res, error, "Unable to create category.");
  }
};

// ======================================================
// Get All Categories
// GET /api/categories
// ======================================================

const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    logError("Get categories error:", error);

    return sendError(res, error, "Unable to fetch categories.");
  }
};

// ======================================================
// Get Category By ID
// GET /api/categories/:id
// ======================================================

const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    return res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    logError("Get category error:", error);

    return sendError(res, error, "Unable to fetch category.");
  }
};

// ======================================================
// Update Category
// PUT /api/categories/:id
// ======================================================

const updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body
    );

    await writeAuditLog({
      req,
      action: "update",
      description: `Category "${category.name}" was updated.`,
      entityType: "Category",
      entityId: category.id
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      category
    });
  } catch (error) {
    logError("Update category error:", error);

    return sendError(res, error, "Unable to update category.");
  }
};

// ======================================================
// Deactivate Category
// DELETE /api/categories/:id
// ======================================================

const deactivateCategory = async (req, res) => {
  try {
    const category = await categoryService.deactivateCategory(req.params.id);

    await writeAuditLog({
      req,
      action: "delete",
      description: `Category "${category.name}" was deactivated.`,
      entityType: "Category",
      entityId: category.id
    });

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully."
    });
  } catch (error) {
    logError("Deactivate category error:", error);

    return sendError(res, error, "Unable to deactivate category.");
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory
};
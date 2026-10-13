
const { Category, Medicine } = require("../models");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertNameAvailable = async (name, excludeId = null) => {
  const existing = await Category.findOne({ where: { name } });

  if (existing && existing.id !== excludeId) {
    throw createHttpError(
      "A category with this name already exists.",
      409
    );
  }
};

// ======================================================
// Create Category
// ======================================================

const createCategory = async (data) => {
  const { name, description } = data;

  await assertNameAvailable(name);

  return Category.create({ name, description });
};

// ======================================================
// Get All Categories
// ======================================================

const getAllCategories = async () =>
  Category.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]]
  });

// ======================================================
// Get Category By ID
// ======================================================

const getCategoryById = async (id) => {
  const category = await Category.findByPk(id);

  if (!category) {
    throw createHttpError("Category not found.", 404);
  }

  return category;
};

// ======================================================
// Update Category
// ======================================================

const updateCategory = async (id, data) => {
  const category = await Category.findByPk(id);

  if (!category) {
    throw createHttpError("Category not found.", 404);
  }

  if (data.name && data.name !== category.name) {
    await assertNameAvailable(data.name, category.id);
  }

  await category.update(data);

  return category;
};

// ======================================================
// Deactivate Category
// ======================================================

const deactivateCategory = async (id) => {
  const category = await Category.findByPk(id);

  if (!category) {
    throw createHttpError("Category not found.", 404);
  }

  if (!category.isActive) {
    throw createHttpError("Category is already deactivated.", 400);
  }

  const medicineCount = await Medicine.count({
    where: { categoryId: category.id, isActive: true }
  });

  if (medicineCount > 0) {
    throw createHttpError(
      "Cannot deactivate a category that is still assigned to active medicines.",
      409
    );
  }

  await category.update({ isActive: false });

  return category;
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory
};

const { z } = require("zod");

// ======================================================
// Create Category
// ======================================================

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters long.")
    .max(100, "Category name cannot exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(
      1000,
      "Category description cannot exceed 1000 characters."
    )
    .optional()
    .or(z.literal(""))
});

// ======================================================
// Update Category
// ======================================================

const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters long.")
    .max(100, "Category name cannot exceed 100 characters.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(
      1000,
      "Category description cannot exceed 1000 characters."
    )
    .optional()
    .or(z.literal(""))
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
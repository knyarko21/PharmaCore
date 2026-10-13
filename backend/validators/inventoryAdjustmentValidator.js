
const { z } = require("zod");

// ======================================================
// Stock Adjustment
// ======================================================

const adjustStockSchema = z.object({
  batchId: z.coerce
    .number()
    .int("Batch ID must be a whole number.")
    .positive("Batch ID must be a positive whole number."),

  quantityChange: z.coerce
    .number()
    .int("Quantity change must be a whole number.")
    .refine(
      (value) => value !== 0,
      {
        message: "Quantity change must be a non-zero whole number."
      }
    ),

  reason: z
    .string()
    .trim()
    .min(3, "Adjustment reason must be at least 3 characters.")
    .max(
      500,
      "Adjustment reason must not exceed 500 characters."
    )
});

module.exports = {
  adjustStockSchema
};
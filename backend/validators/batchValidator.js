
const { z } = require("zod");

// ======================================================
// Reusable: YYYY-MM-DD date
// ======================================================

const batchDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(`${value}T00:00:00`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().startsWith(value)
      );
    },
    {
      message: "Date must be a valid date in YYYY-MM-DD format."
    }
  );

// ======================================================
// Create Batch
// ======================================================

const createBatchSchema = z
  .object({
    batchNumber: z
      .string()
      .trim()
      .min(2, "Batch number must be at least 2 characters long.")
      .max(100, "Batch number cannot exceed 100 characters."),

    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .min(0, "Quantity cannot be negative."),

    purchasePrice: z.coerce
      .number()
      .nonnegative("Purchase price cannot be negative."),

    sellingPrice: z.coerce
      .number()
      .nonnegative("Selling price cannot be negative."),

    expiryDate: batchDateSchema,

    manufactureDate: batchDateSchema
      .optional()
      .or(z.literal("")),

    medicineId: z.coerce
      .number()
      .int("Medicine ID must be a whole number.")
      .positive("Medicine ID must be greater than zero."),

    supplierId: z.coerce
      .number()
      .int("Supplier ID must be a whole number.")
      .positive("Supplier ID must be greater than zero.")
      .optional()
      .nullable()
  })
  .refine(
    (data) => {
      if (!data.manufactureDate || !data.expiryDate) return true;
      return data.manufactureDate <= data.expiryDate;
    },
    {
      message: "Manufacture date cannot be later than expiry date.",
      path: ["manufactureDate"]
    }
  );

// ======================================================
// Update Batch
// ======================================================

const updateBatchSchema = z
  .object({
    batchNumber: z
      .string()
      .trim()
      .min(2, "Batch number must be at least 2 characters long.")
      .max(100, "Batch number cannot exceed 100 characters.")
      .optional(),

    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .min(0, "Quantity cannot be negative.")
      .optional(),

    purchasePrice: z.coerce
      .number()
      .nonnegative("Purchase price cannot be negative.")
      .optional(),

    sellingPrice: z.coerce
      .number()
      .nonnegative("Selling price cannot be negative.")
      .optional(),

    expiryDate: batchDateSchema.optional(),

    manufactureDate: batchDateSchema
      .optional()
      .or(z.literal("")),

    medicineId: z.coerce
      .number()
      .int("Medicine ID must be a whole number.")
      .positive("Medicine ID must be greater than zero.")
      .optional(),

    supplierId: z.coerce
      .number()
      .int("Supplier ID must be a whole number.")
      .positive("Supplier ID must be greater than zero.")
      .optional()
      .nullable()
  })
  .refine(
    (data) => {
      if (!data.manufactureDate || !data.expiryDate) return true;
      return data.manufactureDate <= data.expiryDate;
    },
    {
      message: "Manufacture date cannot be later than expiry date.",
      path: ["manufactureDate"]
    }
  );

module.exports = {
  createBatchSchema,
  updateBatchSchema
};
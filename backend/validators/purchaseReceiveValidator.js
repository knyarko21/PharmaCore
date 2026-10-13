
const { z } = require("zod");

// ======================================================
// Reusable: YYYY-MM-DD date
// ======================================================

const purchaseReceiveDateSchema = z
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
// Receive Purchase Item
// ======================================================

const receivePurchaseItemSchema = z
  .object({
    purchaseItemId: z.coerce
      .number()
      .int("Purchase item ID must be a whole number.")
      .positive("Purchase item ID must be greater than zero."),

    batchNumber: z
      .string()
      .trim()
      .min(2, "Batch number must be at least 2 characters long.")
      .max(100, "Batch number cannot exceed 100 characters."),

    quantity: z.coerce
      .number()
      .int("Received quantity must be a whole number.")
      .min(1, "Received quantity must be at least 1."),

    sellingPrice: z.coerce
      .number()
      .nonnegative("Selling price cannot be negative."),

    expiryDate: purchaseReceiveDateSchema,

    manufactureDate: purchaseReceiveDateSchema
      .optional()
      .or(z.literal(""))
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
// Receive Purchase
// ======================================================

const receivePurchaseSchema = z.object({
  items: z
    .array(receivePurchaseItemSchema)
    .min(1, "At least one purchase item must be received.")
});

module.exports = {
  receivePurchaseItemSchema,
  receivePurchaseSchema
};
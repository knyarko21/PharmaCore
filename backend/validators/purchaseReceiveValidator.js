
const { z } = require("zod");

// ======================================================
// REUSABLE: YYYY-MM-DD DATE VALIDATION
// ======================================================

const purchaseReceiveDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    {
      message: "Date must be a valid date in YYYY-MM-DD format.",
    }
  );

// ======================================================
// BATCH NUMBER VALIDATION
// A blank batch number is allowed because the service
// generates one automatically.
// ======================================================

const purchaseReceiveBatchNumberSchema = z
  .string()
  .trim()
  .max(100, "Batch number cannot exceed 100 characters.")
  .refine(
    (value) => value === "" || value.length >= 2,
    {
      message: "Batch number must be at least 2 characters long.",
    }
  )
  .optional()
  .or(z.literal(""));

// ======================================================
// RECEIVE PURCHASE ITEM
// ======================================================

const receivePurchaseItemSchema = z
  .object({
    purchaseItemId: z.coerce
      .number()
      .int("Purchase item ID must be a whole number.")
      .positive("Purchase item ID must be greater than zero."),

    batchNumber: purchaseReceiveBatchNumberSchema,

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
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (!data.manufactureDate || !data.expiryDate) {
        return true;
      }

      return data.manufactureDate <= data.expiryDate;
    },
    {
      message: "Manufacture date cannot be later than expiry date.",
      path: ["manufactureDate"],
    }
  );

// ======================================================
// RECEIVE PURCHASE VALIDATION
// ======================================================

const receivePurchaseSchema = z.object({
  items: z
    .array(receivePurchaseItemSchema)
    .min(1, "At least one purchase item must be received."),
});

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  receivePurchaseItemSchema,
  receivePurchaseSchema,
};
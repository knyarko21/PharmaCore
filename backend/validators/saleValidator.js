
const { z } = require("zod");

// ======================================================
// Sale Item
// ======================================================
//
// prescriptionItemId is optional here because whether it
// is required depends on the medicine (isPrescriptionRequired).
// That business rule lives in saleService.js.
// ======================================================

const saleItemSchema = z.object({
  medicineId: z.coerce.number().int().positive(),

  quantity: z.coerce.number().int().positive(),

  discount: z.coerce.number().min(0).default(0),

  prescriptionItemId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
});

// ======================================================
// Payment
// ======================================================

const paymentSchema = z.object({
  amount: z.coerce.number().min(0),

  paymentMethod: z.enum([
    "cash",
    "mobile_money",
    "card",
    "bank_transfer"
  ]),

  paymentReference: z.string().trim().optional(),

  transactionReference: z
    .string()
    .trim()
    .optional()
    .nullable(),

  status: z
    .enum(["pending", "completed", "failed", "refunded"])
    .optional(),

  notes: z.string().trim().optional().nullable(),

  paidAt: z.string().optional()
});

// ======================================================
// Create Sale
// ======================================================

const createSaleSchema = z.object({
  saleNumber: z.string().trim().min(1),

  saleDate: z.string().optional(),

  customerId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  discount: z.coerce.number().min(0).default(0),

  tax: z.coerce.number().min(0).default(0),

  notes: z.string().trim().optional().nullable(),

  items: z.array(saleItemSchema).min(1),

  payment: paymentSchema
});

module.exports = {
  saleItemSchema,
  paymentSchema,
  createSaleSchema
};
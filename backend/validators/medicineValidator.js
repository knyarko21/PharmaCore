
const { z } = require("zod");

// ======================================================
// Reusable: Image URL
// ======================================================

const imageUrlSchema = z
  .string()
  .trim()
  .max(2048, "Image URL cannot exceed 2048 characters.")
  .refine(
    (value) => {
      if (value === "") {
        return true;
      }

      try {
        const url = new URL(value);

        return (
          url.protocol === "http:" ||
          url.protocol === "https:"
        );
      } catch {
        return false;
      }
    },
    "Image URL must be a valid HTTP or HTTPS URL."
  )
  .optional()
  .or(z.literal(""));

// ======================================================
// Reusable: SKU
// ======================================================

// SKU is optional in incoming requests because the backend
// generates it automatically when creating a medicine.

const skuSchema = z
  .string()
  .trim()
  .min(2, "SKU must be at least 2 characters long.")
  .max(100, "SKU cannot exceed 100 characters.")
  .optional();

// ======================================================
// Reusable: Fields Shared by Create and Update
// ======================================================

const medicineFields = {
  name: z
    .string()
    .trim()
    .min(
      2,
      "Medicine name must be at least 2 characters long."
    )
    .max(
      150,
      "Medicine name cannot exceed 150 characters."
    ),

  genericName: z
    .string()
    .trim()
    .max(
      150,
      "Generic name cannot exceed 150 characters."
    )
    .optional()
    .or(z.literal("")),

  brandName: z
    .string()
    .trim()
    .max(
      150,
      "Brand name cannot exceed 150 characters."
    )
    .optional()
    .or(z.literal("")),

  dosageForm: z
    .string()
    .trim()
    .min(
      2,
      "Dosage form must be at least 2 characters long."
    )
    .max(
      50,
      "Dosage form cannot exceed 50 characters."
    ),

  strength: z
    .string()
    .trim()
    .max(
      50,
      "Strength cannot exceed 50 characters."
    )
    .optional()
    .or(z.literal("")),

  description: z
    .string()
    .trim()
    .max(
      2000,
      "Description cannot exceed 2000 characters."
    )
    .optional()
    .or(z.literal("")),

  imageUrl: imageUrlSchema,

  sku: skuSchema,

  barcode: z
    .string()
    .trim()
    .max(
      100,
      "Barcode cannot exceed 100 characters."
    )
    .optional()
    .or(z.literal("")),

  reorderLevel: z.coerce
    .number()
    .int("Reorder level must be a whole number.")
    .min(
      0,
      "Reorder level cannot be negative."
    )
    .optional(),

  isPrescriptionRequired: z.boolean().optional(),

  categoryId: z.coerce
    .number()
    .int("Category ID must be a whole number.")
    .positive(
      "Category ID must be greater than zero."
    )
};

// ======================================================
// Create Medicine
// ======================================================

const createMedicineSchema = z.object({
  ...medicineFields
});

// ======================================================
// Update Medicine
// ======================================================

// All update fields are optional because the client may
// update only selected medicine details.

const updateMedicineSchema = z.object({
  name: medicineFields.name.optional(),

  genericName: medicineFields.genericName,

  brandName: medicineFields.brandName,

  dosageForm: medicineFields.dosageForm.optional(),

  strength: medicineFields.strength,

  description: medicineFields.description,

  imageUrl: medicineFields.imageUrl,

  sku: medicineFields.sku,

  barcode: medicineFields.barcode,

  reorderLevel: medicineFields.reorderLevel,

  isPrescriptionRequired:
    medicineFields.isPrescriptionRequired,

  categoryId: medicineFields.categoryId.optional()
});

// ======================================================
// Exports
// ======================================================

module.exports = {
  createMedicineSchema,
  updateMedicineSchema
};
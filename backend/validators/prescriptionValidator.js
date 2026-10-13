
const { z } = require("zod");

// ======================================================
// Reusable: Prescription date (YYYY-MM-DD, real date)
// ======================================================

const prescriptionDateSchema = z
  .string()
  .trim()
  .min(1, "Prescription date is required.")
  .refine(
    (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    },
    {
      message:
        "Prescription date must be a valid date in YYYY-MM-DD format."
    }
  );

// ======================================================
// Prescription Item
// ======================================================

const prescriptionItemSchema = z.object({
  medicineId: z.coerce
    .number()
    .int("Medicine ID must be a whole number.")
    .positive("Medicine ID must be greater than zero."),

  dosage: z
    .string()
    .trim()
    .min(1, "Dosage is required.")
    .max(100, "Dosage cannot exceed 100 characters."),

  frequency: z
    .string()
    .trim()
    .min(1, "Frequency is required.")
    .max(100, "Frequency cannot exceed 100 characters."),

  duration: z
    .string()
    .trim()
    .max(100, "Duration cannot exceed 100 characters.")
    .optional()
    .or(z.literal("")),

  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1."),

  instructions: z
    .string()
    .trim()
    .max(1000, "Instructions cannot exceed 1000 characters.")
    .optional()
    .or(z.literal(""))
});

// ======================================================
// Create Prescription
// ======================================================

const createPrescriptionSchema = z
  .object({
    prescriptionNumber: z
      .string()
      .trim()
      .min(
        3,
        "Prescription number must be at least 3 characters long."
      )
      .max(
        50,
        "Prescription number cannot exceed 50 characters."
      ),

    prescriptionDate: prescriptionDateSchema,

    doctorName: z
      .string()
      .trim()
      .min(1, "Doctor name is required.")
      .max(150, "Doctor name cannot exceed 150 characters."),

    doctorLicenseNumber: z
      .string()
      .trim()
      .max(
        100,
        "Doctor license number cannot exceed 100 characters."
      )
      .optional()
      .or(z.literal("")),

    diagnosis: z
      .string()
      .trim()
      .max(2000, "Diagnosis cannot exceed 2000 characters.")
      .optional()
      .or(z.literal("")),

    notes: z
      .string()
      .trim()
      .max(2000, "Notes cannot exceed 2000 characters.")
      .optional()
      .or(z.literal("")),

    customerId: z.coerce
      .number()
      .int("Customer ID must be a whole number.")
      .positive("Customer ID must be greater than zero."),

    items: z
      .array(prescriptionItemSchema)
      .min(1, "A prescription must contain at least one medicine.")
  })
  .superRefine((data, ctx) => {
    // A medicine should appear only once per prescription.
    // Duplicates must be combined on the frontend.
    const seen = new Set();

    data.items.forEach((item, index) => {
      if (seen.has(item.medicineId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "medicineId"],
          message:
            "A medicine cannot appear more than once in the same prescription."
        });
      }

      seen.add(item.medicineId);
    });
  });

// ======================================================
// Update Prescription
// ======================================================

const updatePrescriptionSchema = z.object({
  prescriptionDate: prescriptionDateSchema.optional(),

  doctorName: z
    .string()
    .trim()
    .min(1, "Doctor name cannot be empty.")
    .max(150, "Doctor name cannot exceed 150 characters.")
    .optional(),

  doctorLicenseNumber: z
    .string()
    .trim()
    .max(
      100,
      "Doctor license number cannot exceed 100 characters."
    )
    .optional()
    .or(z.literal("")),

  diagnosis: z
    .string()
    .trim()
    .max(2000, "Diagnosis cannot exceed 2000 characters.")
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters.")
    .optional()
    .or(z.literal(""))
});

module.exports = {
  prescriptionItemSchema,
  createPrescriptionSchema,
  updatePrescriptionSchema
};
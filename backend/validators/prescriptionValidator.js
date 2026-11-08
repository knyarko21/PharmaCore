
const { z } = require("zod");

// ======================================================
// Prescription date validation
// ======================================================

const prescriptionDateSchema = z
  .string()
  .trim()
  .min(1, "Prescription date is required.")
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
      message:
        "Prescription date must be a valid date in YYYY-MM-DD format.",
    }
  );

// ======================================================
// Registered doctor ID validation
// ======================================================

const doctorIdSchema = z.coerce
  .number()
  .int("Doctor ID must be a whole number.")
  .positive("Please select a registered doctor.");

// ======================================================
// Prescription item validation
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
    .min(1, "Duration is required.")
    .max(100, "Duration cannot exceed 100 characters."),

  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1."),

  instructions: z
    .string()
    .trim()
    .max(1000, "Instructions cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),
});

// ======================================================
// Create prescription validation
// ======================================================

const createPrescriptionSchema = z
  .object({
    // The backend generates the prescription number.
    // This field is retained for compatibility with the UI.
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
      )
      .optional()
      .or(z.literal("")),

    prescriptionDate: prescriptionDateSchema,

    // The frontend must send the ID of a registered doctor.
    // The backend resolves the actual name and licence number.
    doctorId: doctorIdSchema,

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
      .min(
        1,
        "A prescription must contain at least one medicine."
      ),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set();

    data.items.forEach((item, index) => {
      if (seen.has(item.medicineId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "medicineId"],
          message:
            "A medicine cannot appear more than once in the same prescription.",
        });
      }

      seen.add(item.medicineId);
    });
  });

// ======================================================
// Update prescription validation
// ======================================================

const updatePrescriptionSchema = z
  .object({
    prescriptionDate: prescriptionDateSchema.optional(),

    // If a prescription's doctor needs to be changed,
    // a registered doctor ID must be supplied.
    doctorId: doctorIdSchema.optional(),

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

    // Never allow clients to edit generated or verified fields.
    doctorName: z.never().optional(),
    doctorLicenseNumber: z.never().optional(),
    prescriptionNumber: z.never().optional(),
  })
  .strict();

// ======================================================
// Exports
// ======================================================

module.exports = {
  prescriptionDateSchema,
  doctorIdSchema,
  prescriptionItemSchema,
  createPrescriptionSchema,
  updatePrescriptionSchema,
};
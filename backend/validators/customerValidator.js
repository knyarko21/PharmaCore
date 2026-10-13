
const { z } = require("zod");

// ======================================================
// Reusable: Date of birth
// ======================================================

const dateOfBirthSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (value === "") return true;
      return (
        !Number.isNaN(new Date(value).getTime()) &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
      );
    },
    {
      message:
        "Date of birth must be a valid date in YYYY-MM-DD format."
    }
  )
  .refine(
    (value) => {
      if (value === "") return true;
      return new Date(value) <= new Date();
    },
    {
      message: "Date of birth cannot be in the future."
    }
  )
  .optional()
  .or(z.literal(""));

// ======================================================
// Reusable: fields shared by create and update
// ======================================================

const customerFields = {
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters long.")
    .max(50, "First name cannot exceed 50 characters."),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters long.")
    .max(50, "Last name cannot exceed 50 characters."),

  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters.")
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(100, "Email cannot exceed 100 characters.")
    .optional()
    .or(z.literal("")),

  dateOfBirth: dateOfBirthSchema,

  gender: z.enum(["male", "female", "other"]).optional(),

  address: z
    .string()
    .trim()
    .max(1000, "Address cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),

  emergencyContactName: z
    .string()
    .trim()
    .max(
      100,
      "Emergency contact name cannot exceed 100 characters."
    )
    .optional()
    .or(z.literal("")),

  emergencyContactPhone: z
    .string()
    .trim()
    .max(
      30,
      "Emergency contact phone cannot exceed 30 characters."
    )
    .optional()
    .or(z.literal(""))
};

// ======================================================
// Create Customer
// ======================================================

const createCustomerSchema = z.object({ ...customerFields });

// ======================================================
// Update Customer (all fields optional)
// ======================================================

const updateCustomerSchema = z.object({
  firstName: customerFields.firstName.optional(),
  lastName: customerFields.lastName.optional(),
  phone: customerFields.phone,
  email: customerFields.email,
  dateOfBirth: customerFields.dateOfBirth,
  gender: customerFields.gender,
  address: customerFields.address,
  emergencyContactName: customerFields.emergencyContactName,
  emergencyContactPhone: customerFields.emergencyContactPhone
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema
};
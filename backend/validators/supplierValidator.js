
const { z } = require("zod");

// ======================================================
// Reusable: fields shared by create and update
// ======================================================

const supplierFields = {
  name: z
    .string()
    .trim()
    .min(2, "Supplier name must be at least 2 characters long.")
    .max(150, "Supplier name cannot exceed 150 characters."),

  contactPerson: z
    .string()
    .trim()
    .max(100, "Contact person cannot exceed 100 characters.")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters long.")
    .max(30, "Phone number cannot exceed 30 characters."),

  email: z
    .string()
    .trim()
    .email("Please provide a valid supplier email address.")
    .max(100, "Email cannot exceed 100 characters.")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .trim()
    .max(1000, "Address cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),

  licenseNumber: z
    .string()
    .trim()
    .max(100, "License number cannot exceed 100 characters.")
    .optional()
    .or(z.literal(""))
};

// ======================================================
// Create Supplier
// ======================================================

const createSupplierSchema = z.object({
  ...supplierFields,
  phone: supplierFields.phone.min(
    7,
    "Supplier phone number is required."
  )
});

// ======================================================
// Update Supplier (all fields optional)
// ======================================================

const updateSupplierSchema = z.object({
  name: supplierFields.name.optional(),
  contactPerson: supplierFields.contactPerson,
  phone: supplierFields.phone.optional(),
  email: supplierFields.email,
  address: supplierFields.address,
  licenseNumber: supplierFields.licenseNumber
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema
};
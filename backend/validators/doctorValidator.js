
const { z } = require("zod");

const createDoctorSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Doctor's full name must contain at least 2 characters")
    .max(150),

  licenseNumber: z
    .string()
    .trim()
    .min(1, "A real medical licence number is required")
    .max(100),

  specialization: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(150)
    .optional()
    .nullable()
    .or(z.literal("")),

  facility: z.string().trim().max(150).optional().nullable()
});

const updateDoctorSchema = createDoctorSchema.partial().extend({
  isActive: z.boolean().optional()
});

module.exports = {
  createDoctorSchema,
  updateDoctorSchema
};

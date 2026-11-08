
const express = require("express");

const {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deactivateDoctor
} = require("../controllers/doctorController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createDoctorSchema,
  updateDoctorSchema
} = require("../validators/doctorValidator");

const router = express.Router();

const doctorReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

const doctorWriteRoles = ["admin", "pharmacist"];

// GET /api/doctors
router.get(
  "/",
  authenticate,
  authorize(...doctorReadRoles),
  getAllDoctors
);

// GET /api/doctors/:id
router.get(
  "/:id",
  authenticate,
  authorize(...doctorReadRoles),
  getDoctorById
);

// POST /api/doctors
router.post(
  "/",
  authenticate,
  authorize(...doctorWriteRoles),
  validate(createDoctorSchema),
  createDoctor
);

// PUT /api/doctors/:id
router.put(
  "/:id",
  authenticate,
  authorize(...doctorWriteRoles),
  validate(updateDoctorSchema),
  updateDoctor
);

// DELETE /api/doctors/:id
// Deactivates the doctor instead of deleting their historical records.
router.delete(
  "/:id",
  authenticate,
  authorize(...doctorWriteRoles),
  deactivateDoctor
);

module.exports = router;
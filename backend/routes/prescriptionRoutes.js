
const express = require("express");

const {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionSummary,
  getPrescriptionById,
  getPrescriptionItems,
  cancelPrescription
} = require("../controllers/prescriptionController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createPrescriptionSchema
} = require("../validators/prescriptionValidator");

const router = express.Router();

// ======================================================
// Role Permissions
// ======================================================

// Roles allowed to view prescription information.
// Cashier access should be limited to information needed
// for legitimate dispensing and customer service.
const prescriptionReadRoles = [
  "admin",
  "pharmacist",
  "cashier"
];

// Only admins and pharmacists can create or cancel prescriptions.
const prescriptionWriteRoles = [
  "admin",
  "pharmacist"
];

// ======================================================
// Prescription Routes
// ======================================================

// GET /api/prescriptions/summary
router.get(
  "/summary",
  authenticate,
  authorize(...prescriptionReadRoles),
  getPrescriptionSummary
);

// GET /api/prescriptions
router.get(
  "/",
  authenticate,
  authorize(...prescriptionReadRoles),
  getAllPrescriptions
);

// GET /api/prescriptions/:id/items
router.get(
  "/:id/items",
  authenticate,
  authorize(...prescriptionReadRoles),
  getPrescriptionItems
);

// GET /api/prescriptions/:id
router.get(
  "/:id",
  authenticate,
  authorize(...prescriptionReadRoles),
  getPrescriptionById
);

// POST /api/prescriptions
router.post(
  "/",
  authenticate,
  authorize(...prescriptionWriteRoles),
  validate(createPrescriptionSchema),
  createPrescription
);

// DELETE /api/prescriptions/:id
router.delete(
  "/:id",
  authenticate,
  authorize(...prescriptionWriteRoles),
  cancelPrescription
);

module.exports = router;
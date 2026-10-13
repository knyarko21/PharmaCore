
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
// Middleware shortcuts
// ======================================================

const prescriptionRoles = ["admin", "pharmacist"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/prescriptions              list all prescriptions
// GET    /api/prescriptions/summary      counts by status
// GET    /api/prescriptions/:id/items    items for one prescription
// GET    /api/prescriptions/:id          fetch one prescription
// POST   /api/prescriptions              create a prescription
// DELETE /api/prescriptions/:id          cancel a prescription
//
// IMPORTANT: /summary and /:id/items must be declared
// BEFORE /:id — otherwise Express treats "summary" and
// "items" as an ID and the wrong handler fires.
// ======================================================

router.get(
  "/summary",
  authenticate,
  authorize(...prescriptionRoles),
  getPrescriptionSummary
);

router.get(
  "/",
  authenticate,
  authorize(...prescriptionRoles),
  getAllPrescriptions
);

router.get(
  "/:id/items",
  authenticate,
  authorize(...prescriptionRoles),
  getPrescriptionItems
);

router.get(
  "/:id",
  authenticate,
  authorize(...prescriptionRoles),
  getPrescriptionById
);

router.post(
  "/",
  authenticate,
  authorize(...prescriptionRoles),
  validate(createPrescriptionSchema),
  createPrescription
);

router.delete(
  "/:id",
  authenticate,
  authorize(...prescriptionRoles),
  cancelPrescription
);

module.exports = router;
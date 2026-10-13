
const express = require("express");

const {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deactivateMedicine
} = require("../controllers/medicineController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createMedicineSchema,
  updateMedicineSchema
} = require("../validators/medicineValidator");

const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const medicineReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

const medicineWriteRoles = ["admin", "pharmacist", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/medicines      list all medicines
// GET    /api/medicines/:id  fetch one medicine
// POST   /api/medicines      create a medicine
// PUT    /api/medicines/:id  update a medicine
// DELETE /api/medicines/:id  deactivate a medicine
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...medicineReadRoles),
  getAllMedicines
);

router.get(
  "/:id",
  authenticate,
  authorize(...medicineReadRoles),
  getMedicineById
);

router.post(
  "/",
  authenticate,
  authorize(...medicineWriteRoles),
  validate(createMedicineSchema),
  createMedicine
);

router.put(
  "/:id",
  authenticate,
  authorize(...medicineWriteRoles),
  validate(updateMedicineSchema),
  updateMedicine
);

router.delete(
  "/:id",
  authenticate,
  authorize(...medicineWriteRoles),
  deactivateMedicine
);

module.exports = router;
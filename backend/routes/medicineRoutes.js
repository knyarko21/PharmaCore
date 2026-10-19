
const express = require("express");

const {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deactivateMedicine,
} = require("../controllers/medicineController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createMedicineSchema,
  updateMedicineSchema,
} = require("../validators/medicineValidator");

const router = express.Router();

// ======================================================
// ROLE PERMISSIONS
// ======================================================

// Users who can view medicines.
const medicineReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
];

// Users who can create new medicines.
const medicineCreateRoles = [
  "admin",
  "pharmacist",
  "inventory_manager",
  "cashier",
];

// Users who can modify or deactivate existing medicines.
const medicineWriteRoles = [
  "admin",
  "pharmacist",
  "inventory_manager",
];

// ======================================================
// MEDICINE ROUTES
// ======================================================

// GET /api/medicines
// All authorized roles can view the medicine list.
router.get(
  "/",
  authenticate,
  authorize(...medicineReadRoles),
  getAllMedicines
);

// GET /api/medicines/:id
// All authorized roles can view medicine details.
router.get(
  "/:id",
  authenticate,
  authorize(...medicineReadRoles),
  getMedicineById
);

// POST /api/medicines
// Cashiers can add new medicines.
router.post(
  "/",
  authenticate,
  authorize(...medicineCreateRoles),
  validate(createMedicineSchema),
  createMedicine
);

// PUT /api/medicines/:id
// Cashiers cannot edit existing medicines.
router.put(
  "/:id",
  authenticate,
  authorize(...medicineWriteRoles),
  validate(updateMedicineSchema),
  updateMedicine
);

// DELETE /api/medicines/:id
// Cashiers cannot deactivate existing medicines.
router.delete(
  "/:id",
  authenticate,
  authorize(...medicineWriteRoles),
  deactivateMedicine
);

module.exports = router;
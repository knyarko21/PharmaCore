
const express = require("express");

const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier
} = require("../controllers/supplierController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createSupplierSchema,
  updateSupplierSchema
} = require("../validators/supplierValidator");

const router = express.Router();

// ======================================================
// Role Permissions
// ======================================================

// All operational roles can view suppliers.
const supplierReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

// Only authorized roles can modify supplier records.
const supplierWriteRoles = [
  "admin",
  "pharmacist",
  "inventory_manager"
];

// ======================================================
// Supplier Routes
// ======================================================

// GET /api/suppliers
router.get(
  "/",
  authenticate,
  authorize(...supplierReadRoles),
  getAllSuppliers
);

// GET /api/suppliers/:id
router.get(
  "/:id",
  authenticate,
  authorize(...supplierReadRoles),
  getSupplierById
);

// POST /api/suppliers
router.post(
  "/",
  authenticate,
  authorize(...supplierWriteRoles),
  validate(createSupplierSchema),
  createSupplier
);

// PUT /api/suppliers/:id
router.put(
  "/:id",
  authenticate,
  authorize(...supplierWriteRoles),
  validate(updateSupplierSchema),
  updateSupplier
);

// DELETE /api/suppliers/:id
router.delete(
  "/:id",
  authenticate,
  authorize(...supplierWriteRoles),
  deactivateSupplier
);

module.exports = router;
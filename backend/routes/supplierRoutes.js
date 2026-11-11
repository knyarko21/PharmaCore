
// ===============================================
// PharmaCore - Supplier Routes
// ===============================================

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

// ===============================================
// Supplier Role Permissions
// ===============================================

// View suppliers and supplier details.
const supplierReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement"
];

// Create new suppliers.
const supplierCreateRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement"
];

// Update existing suppliers.
// Cashiers are excluded.
const supplierUpdateRoles = [
  "admin",
  "pharmacist",
  "inventory_manager",
  "procurement"
];

// Deactivate suppliers.
// Only Admin and Inventory Manager.
const supplierDeactivateRoles = [
  "admin",
  "inventory_manager"
];

// ===============================================
// GET /api/suppliers
// View all suppliers
// ===============================================

router.get(
  "/",
  authenticate,
  authorize(...supplierReadRoles),
  getAllSuppliers
);

// ===============================================
// GET /api/suppliers/:id
// View supplier details
// ===============================================

router.get(
  "/:id",
  authenticate,
  authorize(...supplierReadRoles),
  getSupplierById
);

// ===============================================
// POST /api/suppliers
// Create a new supplier
// ===============================================

router.post(
  "/",
  authenticate,
  authorize(...supplierCreateRoles),
  validate(createSupplierSchema),
  createSupplier
);

// ===============================================
// PUT /api/suppliers/:id
// Update an existing supplier
// ===============================================

router.put(
  "/:id",
  authenticate,
  authorize(...supplierUpdateRoles),
  validate(updateSupplierSchema),
  updateSupplier
);

// ===============================================
// DELETE /api/suppliers/:id
// Deactivate a supplier
// ===============================================

router.delete(
  "/:id",
  authenticate,
  authorize(...supplierDeactivateRoles),
  deactivateSupplier
);

// ===============================================
// Export Router
// ===============================================

module.exports = router;
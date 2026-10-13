
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
// Middleware shortcuts
// ======================================================

const supplierRoles = ["admin", "pharmacist", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/suppliers      list all suppliers
// GET    /api/suppliers/:id  fetch one supplier
// POST   /api/suppliers      create a supplier
// PUT    /api/suppliers/:id  update a supplier
// DELETE /api/suppliers/:id  deactivate a supplier
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...supplierRoles),
  getAllSuppliers
);

router.get(
  "/:id",
  authenticate,
  authorize(...supplierRoles),
  getSupplierById
);

router.post(
  "/",
  authenticate,
  authorize(...supplierRoles),
  validate(createSupplierSchema),
  createSupplier
);

router.put(
  "/:id",
  authenticate,
  authorize(...supplierRoles),
  validate(updateSupplierSchema),
  updateSupplier
);

router.delete(
  "/:id",
  authenticate,
  authorize(...supplierRoles),
  deactivateSupplier
);

module.exports = router;
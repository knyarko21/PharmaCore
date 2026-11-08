

const express = require("express");

const {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch
} = require("../controllers/batchController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createBatchSchema,
  updateBatchSchema
} = require("../validators/batchValidator");

const router = express.Router();

// ======================================================
// INVENTORY PERMISSIONS
// ======================================================

// All operational roles can view batch information.
// Cashiers and Procurement are read-only.
const inventoryReadRoles = [
  "superadmin",
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement"
];

// Roles permitted to create and update batches.
const inventoryWriteRoles = [
  "superadmin",
  "admin",
  "pharmacist",
  "inventory_manager"
];

// Only Super Admin, Admin and Inventory Manager
// can delete batches.
const inventoryDeleteRoles = [
  "superadmin",
  "admin",
  "inventory_manager"
];

// ======================================================
// BATCH ROUTES
// ======================================================
//
// GET    /api/batches
// GET    /api/batches/:id
// POST   /api/batches
// PUT    /api/batches/:id
// DELETE /api/batches/:id
//
// ======================================================

// ------------------------------------------------------
// GET ALL BATCHES
// ------------------------------------------------------

router.get(
  "/",
  authenticate,
  authorize(...inventoryReadRoles),
  getAllBatches
);

// ------------------------------------------------------
// GET BATCH BY ID
// ------------------------------------------------------

router.get(
  "/:id",
  authenticate,
  authorize(...inventoryReadRoles),
  getBatchById
);

// ------------------------------------------------------
// CREATE BATCH
// ------------------------------------------------------

router.post(
  "/",
  authenticate,
  authorize(...inventoryWriteRoles),
  validate(createBatchSchema),
  createBatch
);

// ------------------------------------------------------
// UPDATE BATCH
// ------------------------------------------------------

router.put(
  "/:id",
  authenticate,
  authorize(...inventoryWriteRoles),
  validate(updateBatchSchema),
  updateBatch
);

// ------------------------------------------------------
// DELETE BATCH
// ------------------------------------------------------

router.delete(
  "/:id",
  authenticate,
  authorize(...inventoryDeleteRoles),
  deleteBatch
);

module.exports = router;

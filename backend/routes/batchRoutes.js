
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
// Middleware shortcuts
// ======================================================

const inventoryReadRoles = ["admin", "pharmacist", "inventory_manager"];

const inventoryWriteRoles = ["admin", "pharmacist", "inventory_manager"];

const inventoryDeleteRoles = ["admin", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/batches      list all batches
// GET    /api/batches/:id  fetch one batch
// POST   /api/batches      create a batch
// PUT    /api/batches/:id  update a batch
// DELETE /api/batches/:id  delete a batch
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...inventoryReadRoles),
  getAllBatches
);

router.get(
  "/:id",
  authenticate,
  authorize(...inventoryReadRoles),
  getBatchById
);

router.post(
  "/",
  authenticate,
  authorize(...inventoryWriteRoles),
  validate(createBatchSchema),
  createBatch
);

router.put(
  "/:id",
  authenticate,
  authorize(...inventoryWriteRoles),
  validate(updateBatchSchema),
  updateBatch
);

router.delete(
  "/:id",
  authenticate,
  authorize(...inventoryDeleteRoles),
  deleteBatch
);

module.exports = router;
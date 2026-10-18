
const express = require("express");

const {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase,
} = require("../controllers/purchaseController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

// IMPORTANT:
// The filename is PurchaseValidator.js with a capital "P".
// Linux hosting platforms such as Render are case-sensitive.
const {
  createPurchaseSchema,
  updatePurchaseSchema,
} = require("../validators/PurchaseValidator");

const {
  receivePurchaseSchema,
} = require("../validators/purchaseReceiveValidator");

const router = express.Router();

// ======================================================
// Role permissions
// ======================================================

const PURCHASE_ROLES = [
  "admin",
  "pharmacist",
  "inventory_manager",
];

const PURCHASE_CANCEL_ROLES = [
  "admin",
  "inventory_manager",
];

// ======================================================
// GET /api/purchases
// Retrieve all purchases
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...PURCHASE_ROLES),
  getAllPurchases
);

// ======================================================
// GET /api/purchases/:id
// Retrieve a single purchase
// ======================================================

router.get(
  "/:id",
  authenticate,
  authorize(...PURCHASE_ROLES),
  getPurchaseById
);

// ======================================================
// POST /api/purchases
// Create a new purchase
// ======================================================

router.post(
  "/",
  authenticate,
  authorize(...PURCHASE_ROLES),
  validate(createPurchaseSchema),
  createPurchase
);

// ======================================================
// POST /api/purchases/:id/receive
// Receive a purchase and process its inventory
// ======================================================

router.post(
  "/:id/receive",
  authenticate,
  authorize(...PURCHASE_ROLES),
  validate(receivePurchaseSchema),
  receivePurchase
);

// ======================================================
// PUT /api/purchases/:id
// Update an existing purchase
// ======================================================

router.put(
  "/:id",
  authenticate,
  authorize(...PURCHASE_ROLES),
  validate(updatePurchaseSchema),
  updatePurchase
);

// ======================================================
// DELETE /api/purchases/:id
// Cancel a purchase
// Only admins and inventory managers can cancel purchases.
// ======================================================

router.delete(
  "/:id",
  authenticate,
  authorize(...PURCHASE_CANCEL_ROLES),
  cancelPurchase
);

// ======================================================
// Export router
// ======================================================

module.exports = router;
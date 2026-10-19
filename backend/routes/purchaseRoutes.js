

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

const {
  createPurchaseSchema,
  updatePurchaseSchema,
} = require("../validators/PurchaseValidator");

const {
  receivePurchaseSchema,
} = require("../validators/purchaseReceiveValidator");

const router = express.Router();

// Roles allowed to view purchase records.
const PURCHASE_READ_ROLES = [
  "admin",
  "pharmacist",
  "inventory_manager",
  "cashier",
];

// Roles allowed to create and manage purchases.
const PURCHASE_MANAGE_ROLES = [
  "admin",
  "pharmacist",
  "inventory_manager",
];

const PURCHASE_CANCEL_ROLES = [
  "admin",
  "inventory_manager",
];

// View all purchases.
router.get(
  "/",
  authenticate,
  authorize(...PURCHASE_READ_ROLES),
  getAllPurchases
);

// View a single purchase.
router.get(
  "/:id",
  authenticate,
  authorize(...PURCHASE_READ_ROLES),
  getPurchaseById
);

// Create a purchase.
router.post(
  "/",
  authenticate,
  authorize(...PURCHASE_MANAGE_ROLES),
  validate(createPurchaseSchema),
  createPurchase
);

// Receive a purchase and update inventory.
router.post(
  "/:id/receive",
  authenticate,
  authorize(...PURCHASE_MANAGE_ROLES),
  validate(receivePurchaseSchema),
  receivePurchase
);

// Update a purchase.
router.put(
  "/:id",
  authenticate,
  authorize(...PURCHASE_MANAGE_ROLES),
  validate(updatePurchaseSchema),
  updatePurchase
);

// Cancel a purchase.
router.delete(
  "/:id",
  authenticate,
  authorize(...PURCHASE_CANCEL_ROLES),
  cancelPurchase
);

module.exports = router;


const express = require("express");

const {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase
} = require("../controllers/purchaseController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createPurchaseSchema,
  updatePurchaseSchema
} = require("../validators/purchaseValidator");

const {
  receivePurchaseSchema
} = require("../validators/purchaseReceiveValidator");
const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const purchaseRoles = ["admin", "pharmacist", "inventory_manager"];

const purchaseCancelRoles = ["admin", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/purchases              list all purchases
// GET    /api/purchases/:id          fetch one purchase
// POST   /api/purchases              create a purchase
// POST   /api/purchases/:id/receive  mark as received
// PUT    /api/purchases/:id          update a purchase
// DELETE /api/purchases/:id          cancel a purchase
//
// NOTE: /:id/receive is declared before /:id so the more
// specific segment matches first.
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...purchaseRoles),
  getAllPurchases
);

router.get(
  "/:id",
  authenticate,
  authorize(...purchaseRoles),
  getPurchaseById
);

router.post(
  "/",
  authenticate,
  authorize(...purchaseRoles),
  validate(createPurchaseSchema),
  createPurchase
);

router.post(
  "/:id/receive",
  authenticate,
  authorize(...purchaseRoles),
  validate(receivePurchaseSchema),
  receivePurchase
);

router.put(
  "/:id",
  authenticate,
  authorize(...purchaseRoles),
  validate(updatePurchaseSchema),
  updatePurchase
);

router.delete(
  "/:id",
  authenticate,
  authorize(...purchaseCancelRoles),
  cancelPurchase
);

module.exports = router;
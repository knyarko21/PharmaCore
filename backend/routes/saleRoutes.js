
const express = require("express");

const {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale,
  getSaleReceipt,
} = require("../controllers/saleController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const { createSaleSchema } = require("../validators/saleValidator");

const router = express.Router();

// ======================================================
// ROLE PERMISSIONS
// ======================================================

// Roles allowed to process sales and view sales.
// Cashier record-level restrictions are enforced
// inside saleService.js.
const saleRoles = [
  "superadmin",
  "admin",
  "pharmacist",
  "cashier",
];

// Only management and pharmacists can cancel sales.
const saleCancelRoles = [
  "superadmin",
  "admin",
  "pharmacist",
];

// ======================================================
// SALES ROUTES
// ======================================================

// GET /api/sales
router.get(
  "/",
  authenticate,
  authorize(...saleRoles),
  getAllSales
);

// GET /api/sales/:id/receipt
// Keep this before /:id.
router.get(
  "/:id/receipt",
  authenticate,
  authorize(...saleRoles),
  getSaleReceipt
);

// GET /api/sales/:id
router.get(
  "/:id",
  authenticate,
  authorize(...saleRoles),
  getSaleById
);

// POST /api/sales
router.post(
  "/",
  authenticate,
  authorize(...saleRoles),
  validate(createSaleSchema),
  createSale
);

// DELETE /api/sales/:id
router.delete(
  "/:id",
  authenticate,
  authorize(...saleCancelRoles),
  cancelSale
);

module.exports = router;

const express = require("express");

const {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale,
  getSaleReceipt
} = require("../controllers/saleController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createSaleSchema
} = require("../validators/saleValidator");

const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const saleRoles = ["admin", "pharmacist", "cashier"];

const saleCancelRoles = ["admin", "pharmacist"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/sales              list all sales
// GET    /api/sales/:id/receipt  download PDF receipt
// GET    /api/sales/:id          fetch one sale
// POST   /api/sales              create a sale
// DELETE /api/sales/:id          cancel a sale
//
// IMPORTANT: /:id/receipt must be declared BEFORE /:id
// so Express matches the more specific path first.
// ======================================================

router.get("/", authenticate, authorize(...saleRoles), getAllSales);

router.get(
  "/:id/receipt",
  authenticate,
  authorize(...saleRoles),
  getSaleReceipt
);

router.get(
  "/:id",
  authenticate,
  authorize(...saleRoles),
  getSaleById
);

router.post(
  "/",
  authenticate,
  authorize(...saleRoles),
  validate(createSaleSchema),
  createSale
);

router.delete(
  "/:id",
  authenticate,
  authorize(...saleCancelRoles),
  cancelSale
);

module.exports = router;
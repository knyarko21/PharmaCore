
const express = require("express");

const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deactivateCustomer
} = require("../controllers/customerController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createCustomerSchema,
  updateCustomerSchema
} = require("../validators/customerValidator");

const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const customerReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

const customerWriteRoles = ["admin", "pharmacist", "cashier"];

const customerDeleteRoles = ["admin", "pharmacist"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/customers      list all customers
// GET    /api/customers/:id  fetch one customer
// POST   /api/customers      create a customer
// PUT    /api/customers/:id  update a customer
// DELETE /api/customers/:id  deactivate a customer
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...customerReadRoles),
  getAllCustomers
);

router.get(
  "/:id",
  authenticate,
  authorize(...customerReadRoles),
  getCustomerById
);

router.post(
  "/",
  authenticate,
  authorize(...customerWriteRoles),
  validate(createCustomerSchema),
  createCustomer
);

router.put(
  "/:id",
  authenticate,
  authorize(...customerWriteRoles),
  validate(updateCustomerSchema),
  updateCustomer
);

router.delete(
  "/:id",
  authenticate,
  authorize(...customerDeleteRoles),
  deactivateCustomer
);

module.exports = router;
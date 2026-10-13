
const express = require("express");

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory
} = require("../controllers/categoryController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validate } = require("../middleware/validationMiddleware");

const {
  createCategorySchema,
  updateCategorySchema
} = require("../validators/categoryValidator");

const router = express.Router();

// ======================================================
// Middleware shortcuts
// ======================================================

const categoryReadRoles = [
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager"
];

const categoryWriteRoles = ["admin", "pharmacist", "inventory_manager"];

// ======================================================
// Routes
// ======================================================
//
// GET    /api/categories      list all categories
// GET    /api/categories/:id  fetch one category
// POST   /api/categories      create a category
// PUT    /api/categories/:id  update a category
// DELETE /api/categories/:id  deactivate a category
// ======================================================

router.get(
  "/",
  authenticate,
  authorize(...categoryReadRoles),
  getAllCategories
);

router.get(
  "/:id",
  authenticate,
  authorize(...categoryReadRoles),
  getCategoryById
);

router.post(
  "/",
  authenticate,
  authorize(...categoryWriteRoles),
  validate(createCategorySchema),
  createCategory
);

router.put(
  "/:id",
  authenticate,
  authorize(...categoryWriteRoles),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  "/:id",
  authenticate,
  authorize(...categoryWriteRoles),
  deactivateCategory
);

module.exports = router;
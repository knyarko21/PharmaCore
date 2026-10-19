
const express = require("express");

const {
  getUsers,
  reviewUserRegistration,
  updateUserActivation
} = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All user-management routes require an authenticated admin.
router.use(authenticate);
router.use(authorize("admin"));

// GET /api/users
// GET /api/users?approvalStatus=pending
router.get("/", getUsers);

// PATCH /api/users/:id/approval
router.patch("/:id/approval", reviewUserRegistration);

// PATCH /api/users/:id/activation
router.patch("/:id/activation", updateUserActivation);

module.exports = router;
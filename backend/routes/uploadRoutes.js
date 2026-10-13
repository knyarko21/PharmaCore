
const express = require("express");

const {
  uploadMedicineImage
} = require("../controllers/uploadController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

// ======================================================
// Routes
// ======================================================

router.post(
  "/medicine-image",
  authenticate,
  authorize("admin", "pharmacist", "inventory_manager"),
  upload.single("image"),
  uploadMedicineImage
);

module.exports = router;
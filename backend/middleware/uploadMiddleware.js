
const multer = require("multer");

// ======================================================
// Storage Configuration
// ======================================================

// Keep uploaded files in memory temporarily.
// The upload controller will stream them to Cloudinary.
const storage = multer.memoryStorage();

// ======================================================
// File Validation
// ======================================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error("Only JPEG, PNG, WebP, and GIF images are allowed.")
  );
};

// ======================================================
// Multer Upload Instance
// ======================================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  upload,
};
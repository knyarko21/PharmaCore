
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ======================================================
// Storage configuration
// ======================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "uploads", "medicines");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    cb(null, `${unique}${ext}`);
  }
});

// ======================================================
// File filter
// ======================================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."));
};

// ======================================================
// Upload instance
// ======================================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1
  }
});

module.exports = {
  upload
};
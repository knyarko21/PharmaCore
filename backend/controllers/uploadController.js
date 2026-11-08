
const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

// ======================================================
// Image Signature Validation
// ======================================================

const isValidImageBuffer = (buffer, mimetype) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false;
  }

  // JPEG
  if (mimetype === "image/jpeg") {
    return (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  // PNG
  if (mimetype === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // GIF
  if (mimetype === "image/gif") {
    const signature = buffer.toString("ascii", 0, 6);

    return signature === "GIF87a" || signature === "GIF89a";
  }

  // WebP
  if (mimetype === "image/webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
};

// ======================================================
// Cloudinary Upload Helper
// ======================================================

const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "pharmacore/medicines",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new Error("Cloudinary returned an incomplete upload result.")
          );
        }

        resolve(result);
      }
    );

    const sourceStream = Readable.from(buffer);

    sourceStream.on("error", reject);
    uploadStream.on("error", reject);

    sourceStream.pipe(uploadStream);
  });
};

// ======================================================
// Upload Medicine Image
// ======================================================

const uploadMedicineImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided.",
      });
    }

    const validImage = isValidImageBuffer(
      req.file.buffer,
      req.file.mimetype
    );

    if (!validImage) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file is not a valid supported image.",
      });
    }

    const result = await uploadToCloudinary(req.file.buffer);

    return res.status(201).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Upload medicine image error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to upload image. Please try again.",
    });
  }
};

module.exports = {
  uploadMedicineImage,
};

// ======================================================
// Upload Medicine Image
// ======================================================
//
// POST /api/uploads/medicine-image
// Content-Type: multipart/form-data
// Field name: image
//
// Response:
//   { success: true, url: "/uploads/medicines/xxx.png" }
// ======================================================

const uploadMedicineImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided."
      });
    }

    const url = `/uploads/medicines/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      url
    });
  } catch (error) {
    console.error("Upload medicine image error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to upload image."
    });
  }
};

module.exports = {
  uploadMedicineImage
};
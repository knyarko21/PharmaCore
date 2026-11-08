
const doctorService = require("../services/doctorService");

function handleError(res, error) {
  console.error("Doctor API error:", error);

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An error occurred while processing the doctor request."
        : error.message
  });
}

async function createDoctor(req, res) {
  try {
    const doctor = await doctorService.createDoctor(req.body);

    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully.",
      data: doctor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAllDoctors(req, res) {
  try {
    const includeInactive =
      req.query.includeInactive === "true" &&
      ["admin", "pharmacist"].includes(req.user?.role);

    const doctors = await doctorService.getAllDoctors({
      includeInactive
    });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getDoctorById(req, res) {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);

    return res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateDoctor(req, res) {
  try {
    const doctor = await doctorService.updateDoctor(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully.",
      data: doctor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deactivateDoctor(req, res) {
  try {
    const doctor = await doctorService.deactivateDoctor(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Doctor deactivated successfully.",
      data: doctor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deactivateDoctor
};
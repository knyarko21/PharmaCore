
const { Op } = require("sequelize");
const { Doctor } = require("../models");

const doctorAttributes = [
  "id",
  "doctorCode",
  "fullName",
  "licenseNumber",
  "specialization",
  "phone",
  "email",
  "facility",
  "isActive",
  "createdAt",
  "updatedAt"
];

// Generate a readable internal doctor code from the database ID.
function generateDoctorCode(id) {
  return `DOC-${String(id).padStart(6, "0")}`;
}

async function createDoctor(data) {
  const fullName = data.fullName.trim();
  const licenseNumber = data.licenseNumber.trim();

  const existingDoctor = await Doctor.findOne({
    where: {
      [Op.or]: [
        { licenseNumber },
        { fullName }
      ]
    }
  });

  if (existingDoctor && existingDoctor.licenseNumber === licenseNumber) {
    const error = new Error(
      "A doctor with this licence number is already registered."
    );
    error.statusCode = 409;
    throw error;
  }

  // Create the doctor first so the database generates the primary key.
  const doctor = await Doctor.create({
    fullName,
    licenseNumber,
    specialization: data.specialization || null,
    phone: data.phone || null,
    email: data.email || null,
    facility: data.facility || null,
    isActive: true
  });

  // Generate the internal code using the assigned database ID.
  const doctorCode = generateDoctorCode(doctor.id);

  // Save the generated code to the database.
  await doctor.update({ doctorCode });

  return doctor;
}

async function getAllDoctors({ includeInactive = false } = {}) {
  const where = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  return Doctor.findAll({
    where,
    attributes: doctorAttributes,
    order: [["fullName", "ASC"]]
  });
}

async function getDoctorById(id) {
  const doctor = await Doctor.findByPk(id, {
    attributes: doctorAttributes
  });

  if (!doctor) {
    const error = new Error("Doctor not found.");
    error.statusCode = 404;
    throw error;
  }

  return doctor;
}

async function updateDoctor(id, data) {
  const doctor = await getDoctorById(id);

  const changes = { ...data };

  // Prevent clients from changing the internal doctor code.
  delete changes.doctorCode;
  delete changes.id;

  if (changes.fullName !== undefined) {
    changes.fullName = changes.fullName.trim();
  }

  if (changes.licenseNumber !== undefined) {
    changes.licenseNumber = changes.licenseNumber.trim();
  }

  if (changes.licenseNumber) {
    const duplicate = await Doctor.findOne({
      where: {
        licenseNumber: changes.licenseNumber,
        id: { [Op.ne]: id }
      }
    });

    if (duplicate) {
      const error = new Error(
        "Another doctor already uses this licence number."
      );
      error.statusCode = 409;
      throw error;
    }
  }

  await doctor.update(changes);

  return doctor;
}

async function deactivateDoctor(id) {
  const doctor = await getDoctorById(id);

  await doctor.update({ isActive: false });

  return doctor;
}

module.exports = {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deactivateDoctor
};
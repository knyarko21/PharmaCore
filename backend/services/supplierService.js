
const { Supplier } = require("../models");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertLicenseAvailable = async (licenseNumber, excludeId = null) => {
  if (!licenseNumber) return;

  const existing = await Supplier.findOne({ where: { licenseNumber } });

  if (existing && existing.id !== excludeId) {
    throw createHttpError(
      "A supplier with this license number already exists.",
      409
    );
  }
};

// ======================================================
// Create Supplier
// ======================================================

const createSupplier = async (data) => {
  const {
    name,
    contactPerson,
    phone,
    email,
    address,
    licenseNumber
  } = data;

  await assertLicenseAvailable(licenseNumber);

  return Supplier.create({
    name,
    contactPerson,
    phone,
    email,
    address,
    licenseNumber
  });
};

// ======================================================
// Get All Suppliers
// ======================================================

const getAllSuppliers = async () =>
  Supplier.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]]
  });

// ======================================================
// Get Supplier By ID
// ======================================================

const getSupplierById = async (id) => {
  const supplier = await Supplier.findByPk(id);

  if (!supplier) {
    throw createHttpError("Supplier not found.", 404);
  }

  return supplier;
};

// ======================================================
// Update Supplier
// ======================================================

const updateSupplier = async (id, data) => {
  const supplier = await Supplier.findByPk(id);

  if (!supplier) {
    throw createHttpError("Supplier not found.", 404);
  }

  if (
    data.licenseNumber &&
    data.licenseNumber !== supplier.licenseNumber
  ) {
    await assertLicenseAvailable(data.licenseNumber, supplier.id);
  }

  await supplier.update(data);

  return supplier;
};

// ======================================================
// Deactivate Supplier
// ======================================================

const deactivateSupplier = async (id) => {
  const supplier = await Supplier.findByPk(id);

  if (!supplier) {
    throw createHttpError("Supplier not found.", 404);
  }

  await supplier.update({ isActive: false });

  return supplier;
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deactivateSupplier
};
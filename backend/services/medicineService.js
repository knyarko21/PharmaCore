
const crypto = require("crypto");

const { Medicine, Category } = require("../models");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const categoryInclude = [
  {
    model: Category,
    as: "category",
    attributes: ["id", "name"]
  }
];

// ======================================================
// Category Validation
// ======================================================

const assertCategoryExists = async (categoryId) => {
  if (
    categoryId === undefined ||
    categoryId === null ||
    categoryId === ""
  ) {
    throw createHttpError("Please select a medicine category.", 400);
  }

  const category = await Category.findByPk(categoryId);

  if (!category) {
    throw createHttpError(
      "The selected category does not exist.",
      400
    );
  }
};

// ======================================================
// SKU Generation Helpers
// ======================================================

// Converts medicine details into SKU-friendly text.
// Example: "Paracetamol" becomes "PAR".

const getNameCode = (name) => {
  const words = String(name || "")
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "MED";
  }

  if (words.length === 1) {
    return words[0].slice(0, 3) || "MED";
  }

  return words
    .slice(0, 3)
    .map((word) => word.slice(0, 1))
    .join("");
};

// Example: "500 mg" becomes "500MG".

const getStrengthCode = (strength) => {
  const code = String(strength || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  return code.slice(0, 10) || "STD";
};

// Example: "Tablet" becomes "TAB".

const getDosageFormCode = (dosageForm) => {
  const code = String(dosageForm || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  return code.slice(0, 3) || "OTH";
};

// Generates a unique SKU using the medicine details and
// a random suffix. Existing records are not modified.

const generateUniqueSku = async ({
  name,
  strength,
  dosageForm
}) => {
  const nameCode = getNameCode(name);
  const strengthCode = getStrengthCode(strength);
  const formCode = getDosageFormCode(dosageForm);

  const prefix = `MED-${nameCode}-${strengthCode}-${formCode}`;

  // Retry in the unlikely event of a duplicate SKU.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    const sku = `${prefix}-${suffix}`;

    const existing = await Medicine.findOne({
      where: { sku }
    });

    if (!existing) {
      return sku;
    }
  }

  throw createHttpError(
    "Unable to generate a unique medicine SKU. Please try again.",
    500
  );
};

// ======================================================
// Barcode Validation
// ======================================================

const assertBarcodeAvailable = async (
  barcode,
  excludeId = null
) => {
  if (
    barcode === undefined ||
    barcode === null ||
    String(barcode).trim() === ""
  ) {
    return;
  }

  const normalizedBarcode = String(barcode).trim();

  const existing = await Medicine.findOne({
    where: { barcode: normalizedBarcode }
  });

  if (
    existing &&
    Number(existing.id) !== Number(excludeId)
  ) {
    throw createHttpError(
      "A medicine with this barcode already exists.",
      409
    );
  }
};

// ======================================================
// General Helpers
// ======================================================

const normalizeImageUrl = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim()
    : null;

// ======================================================
// Create Medicine
// ======================================================

const createMedicine = async (data) => {
  const {
    name,
    genericName,
    brandName,
    dosageForm,
    strength,
    description,
    imageUrl,
    barcode,
    reorderLevel,
    isPrescriptionRequired,
    categoryId
  } = data;

  // Validate required details before creating the record.
  if (!name || !String(name).trim()) {
    throw createHttpError(
      "Medicine name is required.",
      400
    );
  }

  if (!dosageForm || !String(dosageForm).trim()) {
    throw createHttpError(
      "Dosage form is required.",
      400
    );
  }

  await assertCategoryExists(categoryId);

  // The backend generates the SKU automatically.
  // A SKU supplied by the frontend is not trusted.
  const sku = await generateUniqueSku({
    name,
    strength,
    dosageForm
  });

  await assertBarcodeAvailable(barcode);

  const medicine = await Medicine.create({
    name: String(name).trim(),
    genericName,
    brandName,
    dosageForm: String(dosageForm).trim(),
    strength,
    description,
    imageUrl: normalizeImageUrl(imageUrl),
    sku,
    barcode:
      typeof barcode === "string" && barcode.trim()
        ? barcode.trim()
        : null,
    reorderLevel,
    isPrescriptionRequired,
    categoryId
  });

  return Medicine.findByPk(medicine.id, {
    include: categoryInclude
  });
};

// ======================================================
// Get All Medicines
// ======================================================

const getAllMedicines = async () =>
  Medicine.findAll({
    where: { isActive: true },
    include: categoryInclude,
    order: [["name", "ASC"]]
  });

// ======================================================
// Get Medicine By ID
// ======================================================

const getMedicineById = async (id) => {
  const medicine = await Medicine.findByPk(id, {
    include: categoryInclude
  });

  if (!medicine) {
    throw createHttpError("Medicine not found.", 404);
  }

  return medicine;
};

// ======================================================
// Update Medicine
// ======================================================

const updateMedicine = async (id, data) => {
  const medicine = await Medicine.findByPk(id);

  if (!medicine) {
    throw createHttpError("Medicine not found.", 404);
  }

  // Validate a new category if one was supplied.
  if (
    data.categoryId !== undefined &&
    data.categoryId !== null &&
    Number(data.categoryId) !== Number(medicine.categoryId)
  ) {
    await assertCategoryExists(data.categoryId);
  }

  // Validate a new barcode if one was supplied.
  if (
    Object.prototype.hasOwnProperty.call(data, "barcode")
  ) {
    await assertBarcodeAvailable(
      data.barcode,
      medicine.id
    );
  }

  const updateData = { ...data };

  // Never allow an update request to change the existing SKU.
  delete updateData.sku;

  // Normalize image URLs consistently.
  if (
    Object.prototype.hasOwnProperty.call(
      updateData,
      "imageUrl"
    )
  ) {
    updateData.imageUrl = normalizeImageUrl(
      updateData.imageUrl
    );
  }

  // Normalize text fields if supplied.
  if (
    typeof updateData.name === "string"
  ) {
    updateData.name = updateData.name.trim();
  }

  if (
    typeof updateData.dosageForm === "string"
  ) {
    updateData.dosageForm =
      updateData.dosageForm.trim();
  }

  await medicine.update(updateData);

  return Medicine.findByPk(medicine.id, {
    include: categoryInclude
  });
};

// ======================================================
// Deactivate Medicine
// ======================================================

const deactivateMedicine = async (id) => {
  const medicine = await Medicine.findByPk(id);

  if (!medicine) {
    throw createHttpError("Medicine not found.", 404);
  }

  await medicine.update({
    isActive: false
  });

  return medicine;
};

// ======================================================
// Exports
// ======================================================

module.exports = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deactivateMedicine
};
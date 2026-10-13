
const { Batch, Medicine, Supplier } = require("../models");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Batch number must be unique and non-empty.
const assertBatchNumberAvailable = async (batchNumber, excludeId = null) => {
  const existing = await Batch.findOne({ where: { batchNumber } });

  if (existing && existing.id !== excludeId) {
    throw createHttpError(
      "A batch with this batch number already exists.",
      409
    );
  }
};

// Selling price must be >= purchase price.
const assertSellingPriceValid = (sellingPrice, purchasePrice) => {
  if (Number(sellingPrice) < Number(purchasePrice)) {
    throw createHttpError(
      "Selling price cannot be lower than purchase price.",
      400
    );
  }
};

// Expiry date must be strictly in the future.
const assertExpiryInFuture = (expiryDate) => {
  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
    throw createHttpError(
      "Batch expiry date must be in the future.",
      400
    );
  }
};

// Full include block used on every read/write that returns a batch.
const batchInclude = [
  {
    model: Medicine,
    as: "medicine",
    attributes: [
      "id",
      "name",
      "genericName",
      "brandName",
      "dosageForm",
      "strength",
      "sku"
    ]
  },
  {
    model: Supplier,
    as: "supplier",
    attributes: ["id", "name", "phone"]
  }
];

// ======================================================
// Create Batch
// ======================================================

const createBatch = async (data) => {
  const {
    batchNumber,
    quantity,
    purchasePrice,
    sellingPrice,
    expiryDate,
    manufactureDate,
    medicineId,
    supplierId
  } = data;

  const medicine = await Medicine.findByPk(medicineId);

  if (!medicine) {
    throw createHttpError("The selected medicine does not exist.", 400);
  }

  if (supplierId) {
    const supplier = await Supplier.findByPk(supplierId);

    if (!supplier) {
      throw createHttpError("The selected supplier does not exist.", 400);
    }
  }

  await assertBatchNumberAvailable(batchNumber);
  assertSellingPriceValid(sellingPrice, purchasePrice);
  assertExpiryInFuture(expiryDate);

  const batch = await Batch.create({
    batchNumber,
    quantity,
    purchasePrice,
    sellingPrice,
    expiryDate,
    manufactureDate,
    medicineId,
    supplierId
  });

  return Batch.findByPk(batch.id, { include: batchInclude });
};

// ======================================================
// Get All Batches
// ======================================================

const getAllBatches = async () =>
  Batch.findAll({
    include: batchInclude,
    order: [["expiryDate", "ASC"]]
  });

// ======================================================
// Get Batch By ID
// ======================================================

const getBatchById = async (id) => {
  const batch = await Batch.findByPk(id, { include: batchInclude });

  if (!batch) {
    throw createHttpError("Batch not found.", 404);
  }

  return batch;
};

// ======================================================
// Update Batch
// ======================================================

const updateBatch = async (id, data) => {
  const batch = await Batch.findByPk(id);

  if (!batch) {
    throw createHttpError("Batch not found.", 404);
  }

  if (data.medicineId && Number(data.medicineId) !== batch.medicineId) {
    const medicine = await Medicine.findByPk(data.medicineId);

    if (!medicine) {
      throw createHttpError("The selected medicine does not exist.", 400);
    }
  }

  if (data.supplierId && Number(data.supplierId) !== batch.supplierId) {
    const supplier = await Supplier.findByPk(data.supplierId);

    if (!supplier) {
      throw createHttpError("The selected supplier does not exist.", 400);
    }
  }

  if (data.batchNumber && data.batchNumber !== batch.batchNumber) {
    await assertBatchNumberAvailable(data.batchNumber, batch.id);
  }

  const purchasePrice =
    data.purchasePrice ?? Number(batch.purchasePrice);

  const sellingPrice =
    data.sellingPrice ?? Number(batch.sellingPrice);

  assertSellingPriceValid(sellingPrice, purchasePrice);

  if (data.expiryDate) {
    assertExpiryInFuture(data.expiryDate);
  }

  await batch.update(data);

  return Batch.findByPk(batch.id, { include: batchInclude });
};

// ======================================================
// Delete Batch
// ======================================================

const deleteBatch = async (id) => {
  const batch = await Batch.findByPk(id);

  if (!batch) {
    throw createHttpError("Batch not found.", 404);
  }

  const deletedBatch = {
    id: batch.id,
    batchNumber: batch.batchNumber,
    medicineId: batch.medicineId,
    supplierId: batch.supplierId
  };

  await batch.destroy();

  return deletedBatch;
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch
};

const crypto = require("crypto");
const { Op } = require("sequelize");

const {
  sequelize,
  Purchase,
  PurchaseItem,
  Supplier,
  Medicine,
  User,
  Batch,
} = require("../models");

const { createAuditLog } = require("./auditLogService");

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

const generatePurchaseNumber = () => {
  const date = getToday().replace(/-/g, "");
  const randomNumber = crypto.randomInt(100000, 1000000);

  return `PUR-${date}-${randomNumber}`;
};

const generateBatchNumber = () => {
  const date = getToday().replace(/-/g, "");
  const randomNumber = crypto.randomInt(100000, 1000000);

  return `BATCH-${date}-${randomNumber}`;
};

// --------------------------------------------------
// UNIQUE NUMBER GENERATION
// --------------------------------------------------

const generateUniquePurchaseNumber = async (transaction) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const purchaseNumber = generatePurchaseNumber();

    const existingPurchase = await Purchase.findOne({
      where: { purchaseNumber },
      transaction,
    });

    if (!existingPurchase) {
      return purchaseNumber;
    }
  }

  throw createHttpError(
    "Unable to generate a unique purchase number. Please try again.",
    503
  );
};

const generateUniqueBatchNumber = async (transaction) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const batchNumber = generateBatchNumber();

    const existingBatch = await Batch.findOne({
      where: { batchNumber },
      transaction,
    });

    if (!existingBatch) {
      return batchNumber;
    }
  }

  throw createHttpError(
    "Unable to generate a unique batch number. Please try receiving the purchase again.",
    503
  );
};

// --------------------------------------------------
// AUDIT LOGGING
// --------------------------------------------------

const writeAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  details,
  requestMetadata = {},
}) => {
  if (!userId || typeof createAuditLog !== "function") {
    return;
  }

  try {
    await createAuditLog({
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress: requestMetadata.ipAddress || null,
      userAgent: requestMetadata.userAgent || null,
    });
  } catch (error) {
    // A logging failure must not undo a completed purchase operation.
    console.error("Purchase audit log failed:", error.message);
  }
};

// --------------------------------------------------
// PURCHASE INCLUDES
// IMPORTANT: The User association alias is "creator".
// --------------------------------------------------

const getPurchaseIncludes = () => [
  {
    model: Supplier,
    as: "supplier",
    required: false,
  },
  {
    model: User,
    as: "creator",
    required: false,
    attributes: {
      exclude: ["password"],
    },
  },
  {
    model: PurchaseItem,
    as: "items",
    required: false,
    include: [
      {
        model: Medicine,
        as: "medicine",
        required: false,
      },
    ],
  },
];

// --------------------------------------------------
// CREATE PURCHASE
// --------------------------------------------------

const createPurchase = async (
  data,
  userId,
  requestMetadata = {}
) => {
  const transaction = await sequelize.transaction();

  let purchase;

  try {
    const {
      supplierId,
      expectedDeliveryDate,
      notes,
      items,
    } = data;

    if (!supplierId) {
      throw createHttpError("Please select a supplier.");
    }

    if (
      expectedDeliveryDate &&
      !isValidDate(expectedDeliveryDate)
    ) {
      throw createHttpError(
        "Expected delivery date must be a valid date in YYYY-MM-DD format."
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw createHttpError(
        "A purchase must contain at least one medicine."
      );
    }

    const supplier = await Supplier.findByPk(supplierId, {
      transaction,
    });

    if (!supplier) {
      throw createHttpError(
        "Selected supplier was not found.",
        404
      );
    }

    const normalizedItems = [];
    const seenMedicineIds = new Set();

    for (const item of items) {
      const medicineId = Number(item.medicineId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (
        !Number.isInteger(medicineId) ||
        medicineId <= 0
      ) {
        throw createHttpError(
          "Every purchase item must have a valid medicine."
        );
      }

      if (seenMedicineIds.has(medicineId)) {
        throw createHttpError(
          "A medicine cannot appear more than once in the same purchase. Combine its quantities."
        );
      }

      seenMedicineIds.add(medicineId);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw createHttpError(
          "Purchase quantities must be positive whole numbers."
        );
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        throw createHttpError(
          "Purchase prices must be valid, non-negative amounts."
        );
      }

      const medicine = await Medicine.findByPk(medicineId, {
        transaction,
      });

      if (!medicine) {
        throw createHttpError(
          `Medicine with ID ${medicineId} was not found.`,
          404
        );
      }

      normalizedItems.push({
        medicineId,
        quantity,
        unitPrice,
        totalPrice: Number(
          (quantity * unitPrice).toFixed(2)
        ),
      });
    }

    const totalAmount = Number(
      normalizedItems
        .reduce((sum, item) => sum + item.totalPrice, 0)
        .toFixed(2)
    );

    const purchaseNumber =
      await generateUniquePurchaseNumber(transaction);

    purchase = await Purchase.create(
      {
        purchaseNumber,
        supplierId,
        createdById: userId,
        expectedDeliveryDate: expectedDeliveryDate || null,
        notes: notes || null,
        status: "pending",
        totalAmount,
      },
      { transaction }
    );

    await PurchaseItem.bulkCreate(
      normalizedItems.map((item) => ({
        purchaseId: purchase.id,
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      { transaction }
    );

    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      throw createHttpError(
        "A duplicate purchase number was detected. Please try again.",
        409
      );
    }

    throw error;
  }

  await writeAuditLog({
    userId,
    action: "PURCHASE_CREATED",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
      supplierId: purchase.supplierId,
      totalAmount: purchase.totalAmount,
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// --------------------------------------------------
// GET ALL PURCHASES
// --------------------------------------------------

const getAllPurchases = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  if (filters.search) {
    const search = String(filters.search).trim();

    if (search) {
      where.purchaseNumber = {
        [Op.like]: `%${search}%`,
      };
    }
  }

  return Purchase.findAll({
    where,
    include: getPurchaseIncludes(),
    order: [["createdAt", "DESC"]],
  });
};

// --------------------------------------------------
// GET PURCHASE BY ID
// --------------------------------------------------

const getPurchaseById = async (purchaseId) => {
  const purchase = await Purchase.findByPk(purchaseId, {
    include: getPurchaseIncludes(),
  });

  if (!purchase) {
    throw createHttpError(
      "Purchase was not found.",
      404
    );
  }

  return purchase;
};

// --------------------------------------------------
// UPDATE PENDING PURCHASE
// --------------------------------------------------

const updatePurchase = async (
  purchaseId,
  data,
  userId,
  requestMetadata = {}
) => {
  const transaction = await sequelize.transaction();

  try {
    const purchase = await Purchase.findByPk(purchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!purchase) {
      throw createHttpError(
        "Purchase was not found.",
        404
      );
    }

    if (purchase.status !== "pending") {
      throw createHttpError(
        "Only pending purchases can be updated."
      );
    }

    const {
      supplierId,
      expectedDeliveryDate,
      notes,
      items,
    } = data;

    if (supplierId !== undefined) {
      const supplier = await Supplier.findByPk(supplierId, {
        transaction,
      });

      if (!supplier) {
        throw createHttpError(
          "Selected supplier was not found.",
          404
        );
      }

      purchase.supplierId = supplierId;
    }

    if (expectedDeliveryDate !== undefined) {
      if (
        expectedDeliveryDate &&
        !isValidDate(expectedDeliveryDate)
      ) {
        throw createHttpError(
          "Expected delivery date must be a valid date in YYYY-MM-DD format."
        );
      }

      purchase.expectedDeliveryDate =
        expectedDeliveryDate || null;
    }

    if (notes !== undefined) {
      purchase.notes = notes || null;
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        throw createHttpError(
          "A purchase must contain at least one medicine."
        );
      }

      const normalizedItems = [];
      const seenMedicineIds = new Set();

      for (const item of items) {
        const medicineId = Number(item.medicineId);
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (
          !Number.isInteger(medicineId) ||
          medicineId <= 0
        ) {
          throw createHttpError(
            "Every purchase item must have a valid medicine."
          );
        }

        if (seenMedicineIds.has(medicineId)) {
          throw createHttpError(
            "A medicine cannot appear more than once in the same purchase."
          );
        }

        seenMedicineIds.add(medicineId);

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw createHttpError(
            "Purchase quantities must be positive whole numbers."
          );
        }

        if (
          !Number.isFinite(unitPrice) ||
          unitPrice < 0
        ) {
          throw createHttpError(
            "Purchase prices must be valid, non-negative amounts."
          );
        }

        const medicine = await Medicine.findByPk(medicineId, {
          transaction,
        });

        if (!medicine) {
          throw createHttpError(
            `Medicine with ID ${medicineId} was not found.`,
            404
          );
        }

        normalizedItems.push({
          purchaseId: purchase.id,
          medicineId,
          quantity,
          unitPrice,
          totalPrice: Number(
            (quantity * unitPrice).toFixed(2)
          ),
        });
      }

      await PurchaseItem.destroy({
        where: {
          purchaseId: purchase.id,
        },
        transaction,
      });

      await PurchaseItem.bulkCreate(normalizedItems, {
        transaction,
      });

      purchase.totalAmount = Number(
        normalizedItems
          .reduce((sum, item) => sum + item.totalPrice, 0)
          .toFixed(2)
      );
    }

    await purchase.save({ transaction });

    await transaction.commit();

    await writeAuditLog({
      userId,
      action: "PURCHASE_UPDATED",
      entity: "Purchase",
      entityId: purchase.id,
      details: {
        purchaseNumber: purchase.purchaseNumber,
      },
      requestMetadata,
    });

    return getPurchaseById(purchase.id);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

// --------------------------------------------------
// CANCEL PENDING PURCHASE
// --------------------------------------------------

const cancelPurchase = async (
  purchaseId,
  userId,
  requestMetadata = {}
) => {
  const transaction = await sequelize.transaction();

  let purchase;

  try {
    purchase = await Purchase.findByPk(purchaseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!purchase) {
      throw createHttpError(
        "Purchase was not found.",
        404
      );
    }

    if (purchase.status !== "pending") {
      throw createHttpError(
        "Only pending purchases can be cancelled."
      );
    }

    purchase.status = "cancelled";

    await purchase.save({ transaction });

    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }

  await writeAuditLog({
    userId,
    action: "PURCHASE_CANCELLED",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// --------------------------------------------------
// RECEIVE PURCHASE
// --------------------------------------------------

const receivePurchase = async (
  purchaseId,
  data,
  userId,
  requestMetadata = {}
) => {
  const transaction = await sequelize.transaction();

  let purchase;
  const receivedBatchNumbers = [];

  try {
    purchase = await Purchase.findByPk(purchaseId, {
      include: [
        {
          model: PurchaseItem,
          as: "items",
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!purchase) {
      throw createHttpError(
        "Purchase was not found.",
        404
      );
    }

    if (purchase.status !== "pending") {
      throw createHttpError(
        "Only pending purchases can be received."
      );
    }

    if (
      !data ||
      !Array.isArray(data.items) ||
      data.items.length === 0
    ) {
      throw createHttpError(
        "Provide the received quantities and batch details for this purchase."
      );
    }

    if (data.items.length !== purchase.items.length) {
      throw createHttpError(
        "Every item in the purchase must be included when receiving it."
      );
    }

    const seenPurchaseItemIds = new Set();

    for (const receivedItem of data.items) {
      const purchaseItemId = Number(
        receivedItem.purchaseItemId
      );

      if (
        !Number.isInteger(purchaseItemId) ||
        purchaseItemId <= 0
      ) {
        throw createHttpError(
          "Every received item must reference a valid purchase item."
        );
      }

      if (seenPurchaseItemIds.has(purchaseItemId)) {
        throw createHttpError(
          "A purchase item cannot be received more than once in the same request."
        );
      }

      seenPurchaseItemIds.add(purchaseItemId);

      const purchaseItem = purchase.items.find(
        (item) => Number(item.id) === purchaseItemId
      );

      if (!purchaseItem) {
        throw createHttpError(
          "A received item does not belong to this purchase."
        );
      }

      const quantity = Number(receivedItem.quantity);
      const sellingPrice = Number(receivedItem.sellingPrice);
      const purchasePrice = Number(purchaseItem.unitPrice);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw createHttpError(
          "Received quantities must be positive whole numbers."
        );
      }

      if (quantity > Number(purchaseItem.quantity)) {
        throw createHttpError(
          "Received quantity cannot exceed the quantity ordered."
        );
      }

      const medicine = await Medicine.findByPk(
        purchaseItem.medicineId,
        { transaction }
      );

      if (!medicine) {
        throw createHttpError(
          "A medicine associated with this purchase was not found.",
          404
        );
      }

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < purchasePrice
      ) {
        throw createHttpError(
          `Selling price for ${medicine.name} must be at least its purchase price.`
        );
      }

      const expiryDate = receivedItem.expiryDate;

      if (!isValidDate(expiryDate)) {
        throw createHttpError(
          `Enter a valid expiry date for ${medicine.name} in YYYY-MM-DD format.`
        );
      }

      if (expiryDate <= getToday()) {
        throw createHttpError(
          `The expiry date for ${medicine.name} must be in the future.`
        );
      }

      const manufactureDate =
        receivedItem.manufactureDate || null;

      if (
        manufactureDate &&
        !isValidDate(manufactureDate)
      ) {
        throw createHttpError(
          `Enter a valid manufacture date for ${medicine.name}.`
        );
      }

      if (
        manufactureDate &&
        manufactureDate > expiryDate
      ) {
        throw createHttpError(
          `Manufacture date cannot be later than the expiry date for ${medicine.name}.`
        );
      }

      // --------------------------------------------------
      // GENERATE A BATCH NUMBER IF THE FIELD IS BLANK
      // --------------------------------------------------

      const suppliedBatchNumber =
        typeof receivedItem.batchNumber === "string"
          ? receivedItem.batchNumber.trim()
          : "";

      if (suppliedBatchNumber.length > 100) {
        throw createHttpError(
          `Batch number for ${medicine.name} cannot exceed 100 characters.`
        );
      }

      const batchNumber =
        suppliedBatchNumber ||
        (await generateUniqueBatchNumber(transaction));

      // --------------------------------------------------
      // CHECK WHETHER THE BATCH ALREADY EXISTS
      // --------------------------------------------------

      const existingBatch = await Batch.findOne({
        where: {
          batchNumber,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingBatch) {
        if (
          Number(existingBatch.medicineId) !==
          Number(purchaseItem.medicineId)
        ) {
          throw createHttpError(
            `Batch number ${batchNumber} is already assigned to another medicine.`
          );
        }

        if (existingBatch.expiryDate !== expiryDate) {
          throw createHttpError(
            `Batch ${batchNumber} already exists with a different expiry date.`
          );
        }

        existingBatch.quantity =
          Number(existingBatch.quantity) + quantity;

        existingBatch.purchasePrice = purchasePrice;
        existingBatch.sellingPrice = sellingPrice;
        existingBatch.manufactureDate = manufactureDate;

        if (purchase.supplierId) {
          existingBatch.supplierId = purchase.supplierId;
        }

        await existingBatch.save({ transaction });
      } else {
        await Batch.create(
          {
            batchNumber,
            quantity,
            purchasePrice,
            sellingPrice,
            expiryDate,
            manufactureDate,
            medicineId: purchaseItem.medicineId,
            supplierId: purchase.supplierId || null,
          },
          { transaction }
        );
      }

      receivedBatchNumbers.push({
        medicine: medicine.name,
        batchNumber,
        quantity,
      });
    }

    // Mark the purchase as received after all items are processed.
    purchase.status = "received";

    await purchase.save({ transaction });

    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      throw createHttpError(
        "A batch number conflict occurred. Please try receiving this purchase again.",
        409
      );
    }

    throw error;
  }

  await writeAuditLog({
    userId,
    action: "PURCHASE_RECEIVED",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
      batches: receivedBatchNumbers,
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase,
};

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

// ======================================================
// CONFIGURATION & HELPERS
// ======================================================

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createHttpError(`${fieldName} must be a valid ID.`);
  }

  return id;
};

const requireUserId = (userId) => {
  if (
    userId === undefined ||
    userId === null ||
    userId === ""
  ) {
    throw createHttpError(
      "Your login session could not be verified. Please log in again.",
      401
    );
  }

  return normalizeId(userId, "Authenticated user ID");
};

const validateDate = (value, fieldName = "Date") => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw createHttpError(
      `${fieldName} must use YYYY-MM-DD format.`
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createHttpError(`${fieldName} is not a valid date.`);
  }

  return value;
};

const getToday = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const generatePurchaseNumber = () => {
  const date = getToday().replace(/-/g, "");

  return `PUR-${date}-${crypto.randomInt(100000, 1000000)}`;
};

const generateBatchNumber = () => {
  const date = getToday().replace(/-/g, "");

  return `BATCH-${date}-${crypto.randomInt(100000, 1000000)}`;
};

const normalizeMoney = (value, fieldName = "Price") => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw createHttpError(
      `${fieldName} must be a valid non-negative amount.`
    );
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const calculateTotal = (items) => {
  const cents = items.reduce((sum, item) => {
    return sum + Math.round(item.totalPrice * 100);
  }, 0);

  return cents / 100;
};

const normalizePurchaseItems = async (
  items,
  transaction
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(
      "A purchase must contain at least one medicine."
    );
  }

  const normalizedItems = [];
  const seenMedicineIds = new Set();

  for (const item of items) {
    const medicineId = normalizeId(
      item.medicineId,
      "Medicine ID"
    );

    const quantity = Number(item.quantity);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      throw createHttpError(
        "Purchase quantities must be positive whole numbers."
      );
    }

    if (seenMedicineIds.has(medicineId)) {
      throw createHttpError(
        "A medicine cannot appear more than once in the same purchase. Combine its quantities."
      );
    }

    seenMedicineIds.add(medicineId);

    const unitPrice = normalizeMoney(
      item.unitPrice,
      "Purchase unit price"
    );

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
      totalPrice: normalizeMoney(
        quantity * unitPrice,
        "Purchase item total"
      ),
    });
  }

  return normalizedItems;
};

// ======================================================
// UNIQUE NUMBER GENERATION
// ======================================================

const generateUniquePurchaseNumber = async (transaction) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const purchaseNumber = generatePurchaseNumber();

    const existing = await Purchase.findOne({
      where: { purchaseNumber },
      transaction,
    });

    if (!existing) {
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

    const existing = await Batch.findOne({
      where: { batchNumber },
      transaction,
    });

    if (!existing) {
      return batchNumber;
    }
  }

  throw createHttpError(
    "Unable to generate a unique batch number. Please try again.",
    503
  );
};

// ======================================================
// AUDIT LOGGING
// ======================================================

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
    // Logging failure should not undo a completed operation.
    console.error(
      "Purchase audit log failed:",
      error.message
    );
  }
};

// ======================================================
// ASSOCIATIONS
// ======================================================

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

// ======================================================
// CREATE PURCHASE
// ======================================================

const createPurchase = async (
  data,
  userId,
  requestMetadata = {}
) => {
  const creatorId = requireUserId(userId);

  const transaction = await sequelize.transaction();

  let purchase;

  try {
    const {
      supplierId: rawSupplierId,
      notes,
      items,
    } = data || {};

    const supplierId = normalizeId(
      rawSupplierId,
      "Supplier ID"
    );

    const creator = await User.findByPk(creatorId, {
      transaction,
    });

    if (!creator) {
      throw createHttpError(
        "The logged-in user no longer exists. Please log in again.",
        401
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

    const normalizedItems = await normalizePurchaseItems(
      items,
      transaction
    );

    const totalAmount = calculateTotal(normalizedItems);

    const purchaseNumber =
      await generateUniquePurchaseNumber(transaction);

    // The database column is `createdBy`, not `createdById`.
    // expectedDeliveryDate is omitted because it is not
    // present in the verified purchases table schema.
    purchase = await Purchase.create(
      {
        purchaseNumber,
        purchaseDate: new Date(),
        supplierId,
        createdBy: creatorId,
        notes:
          typeof notes === "string"
            ? notes.trim() || null
            : null,
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
    userId: creatorId,
    action: "create",
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

// ======================================================
// GET ALL PURCHASES
// ======================================================

const getAllPurchases = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.supplierId) {
    where.supplierId = normalizeId(
      filters.supplierId,
      "Supplier ID"
    );
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

// ======================================================
// GET PURCHASE BY ID
// ======================================================

const getPurchaseById = async (purchaseId) => {
  const id = normalizeId(purchaseId, "Purchase ID");

  const purchase = await Purchase.findByPk(id, {
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

// ======================================================
// UPDATE PENDING PURCHASE
// ======================================================

const updatePurchase = async (
  purchaseId,
  data,
  userId,
  requestMetadata = {}
) => {
  const creatorId = requireUserId(userId);
  const id = normalizeId(purchaseId, "Purchase ID");
  const transaction = await sequelize.transaction();

  let purchase;

  try {
    purchase = await Purchase.findByPk(id, {
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
      supplierId: rawSupplierId,
      notes,
      items,
    } = data || {};

    if (rawSupplierId !== undefined) {
      const supplierId = normalizeId(
        rawSupplierId,
        "Supplier ID"
      );

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

    if (notes !== undefined) {
      purchase.notes =
        typeof notes === "string"
          ? notes.trim() || null
          : null;
    }

    if (items !== undefined) {
      const normalizedItems = await normalizePurchaseItems(
        items,
        transaction
      );

      await PurchaseItem.destroy({
        where: { purchaseId: purchase.id },
        transaction,
      });

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

      purchase.totalAmount = calculateTotal(normalizedItems);
    }

    await purchase.save({ transaction });

    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }

  await writeAuditLog({
    userId: creatorId,
    action: "update",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// ======================================================
// CANCEL PENDING PURCHASE
// ======================================================

const cancelPurchase = async (
  purchaseId,
  userId,
  requestMetadata = {}
) => {
  const actorId = requireUserId(userId);
  const id = normalizeId(purchaseId, "Purchase ID");
  const transaction = await sequelize.transaction();

  let purchase;

  try {
    purchase = await Purchase.findByPk(id, {
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
    userId: actorId,
    action: "update",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
      status: "cancelled",
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// ======================================================
// RECEIVE PURCHASE
// ======================================================

const receivePurchase = async (
  purchaseId,
  data,
  userId,
  requestMetadata = {}
) => {
  const actorId = requireUserId(userId);
  const id = normalizeId(purchaseId, "Purchase ID");
  const transaction = await sequelize.transaction();

  let purchase;
  const receivedBatchNumbers = [];

  try {
    purchase = await Purchase.findByPk(id, {
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
      const purchaseItemId = normalizeId(
        receivedItem.purchaseItemId,
        "Purchase item ID"
      );

      if (seenPurchaseItemIds.has(purchaseItemId)) {
        throw createHttpError(
          "A purchase item cannot be received more than once."
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
      const sellingPrice = normalizeMoney(
        receivedItem.sellingPrice,
        "Selling price"
      );
      const purchasePrice = Number(purchaseItem.unitPrice);

      if (
        !Number.isSafeInteger(quantity) ||
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

      if (sellingPrice < purchasePrice) {
        throw createHttpError(
          `Selling price for ${medicine.name} must be at least its purchase price.`
        );
      }

      const expiryDate = validateDate(
        receivedItem.expiryDate,
        `Expiry date for ${medicine.name}`
      );

      if (expiryDate <= getToday()) {
        throw createHttpError(
          `The expiry date for ${medicine.name} must be in the future.`
        );
      }

      let manufactureDate = null;

      if (receivedItem.manufactureDate) {
        manufactureDate = validateDate(
          receivedItem.manufactureDate,
          `Manufacture date for ${medicine.name}`
        );

        if (manufactureDate > expiryDate) {
          throw createHttpError(
            `Manufacture date cannot be later than the expiry date for ${medicine.name}.`
          );
        }
      }

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

      const existingBatch = await Batch.findOne({
        where: { batchNumber },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingBatch) {
        if (
          Number(existingBatch.medicineId) !==
            Number(purchaseItem.medicineId) ||
          String(existingBatch.expiryDate).slice(0, 10) !==
            expiryDate
        ) {
          throw createHttpError(
            `Batch ${batchNumber} already exists with different medicine or expiry details.`
          );
        }

        existingBatch.quantity =
          Number(existingBatch.quantity) + quantity;

        existingBatch.purchasePrice = purchasePrice;
        existingBatch.sellingPrice = sellingPrice;
        existingBatch.manufactureDate = manufactureDate;
        existingBatch.supplierId = purchase.supplierId || null;

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
    userId: actorId,
    action: "update",
    entity: "Purchase",
    entityId: purchase.id,
    details: {
      purchaseNumber: purchase.purchaseNumber,
      status: "received",
      batches: receivedBatchNumbers,
    },
    requestMetadata,
  });

  return getPurchaseById(purchase.id);
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase,
};
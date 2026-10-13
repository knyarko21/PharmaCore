
const crypto = require("crypto");

const sequelize = require("../config/database");

const {
  Purchase,
  PurchaseItem,
  Supplier,
  Medicine,
  User,
  Batch
} = require("../models");

const { createAuditLog } = require("./auditLogService");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const supplierAttributes = ["id", "name", "phone"];

const userAttributes = [
  "id",
  "firstName",
  "lastName",
  "email"
];

const medicineBriefAttributes = [
  "id",
  "name",
  "genericName",
  "brandName",
  "dosageForm",
  "strength",
  "sku"
];

const purchaseIncludes = [
  {
    model: Supplier,
    as: "supplier",
    attributes: supplierAttributes
  },
  {
    model: User,
    as: "creator",
    attributes: userAttributes
  },
  {
    model: PurchaseItem,
    as: "items",
    include: [
      {
        model: Medicine,
        as: "medicine",
        attributes: medicineBriefAttributes
      }
    ]
  }
];

// ======================================================
// Generate Purchase Number
// ======================================================

const generatePurchaseNumber = () => {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const randomNumber = crypto
    .randomInt(100000, 1000000)
    .toString();

  return `PUR-${date}-${randomNumber}`;
};

// ======================================================
// Identify Database Unique-Constraint Errors
// ======================================================

const isUniqueConstraintError = (error) => {
  return (
    error.name === "SequelizeUniqueConstraintError" ||
    error.original?.code === "ER_DUP_ENTRY" ||
    error.parent?.code === "ER_DUP_ENTRY"
  );
};

// ======================================================
// Validate Purchase Items
// ======================================================

const validatePurchaseItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(
      "A purchase must contain at least one medicine item.",
      400
    );
  }

  for (const item of items) {
    const medicineId = Number(item.medicineId);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (
      !Number.isInteger(medicineId) ||
      medicineId <= 0
    ) {
      throw createHttpError(
        "Every purchase item must have a valid medicine.",
        400
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw createHttpError(
        "Purchase quantities must be positive whole numbers.",
        400
      );
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw createHttpError(
        "Purchase prices must be valid non-negative numbers.",
        400
      );
    }
  }
};

// ======================================================
// Create Purchase
// ======================================================

const createPurchase = async (
  data,
  userId,
  requestMetadata = {}
) => {
  const {
    ipAddress = null,
    userAgent = null
  } = requestMetadata;

  const {
    purchaseNumber,
    purchaseDate,
    notes,
    supplierId,
    items
  } = data;

  // ------------------------------------------
  // Validate required data
  // ------------------------------------------

  if (
    !supplierId ||
    !Number.isInteger(Number(supplierId)) ||
    Number(supplierId) <= 0
  ) {
    throw createHttpError(
      "Please select a valid supplier.",
      400
    );
  }

  if (
    purchaseDate &&
    Number.isNaN(new Date(purchaseDate).getTime())
  ) {
    throw createHttpError(
      "Please provide a valid purchase date.",
      400
    );
  }

  validatePurchaseItems(items);

  // ------------------------------------------
  // Validate supplier and creator
  // ------------------------------------------

  const supplier = await Supplier.findByPk(
    Number(supplierId)
  );

  if (!supplier) {
    throw createHttpError(
      "The selected supplier does not exist.",
      400
    );
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw createHttpError(
      "The user creating this purchase does not exist.",
      400
    );
  }

  // ------------------------------------------
  // Validate medicines
  // ------------------------------------------

  const medicineIds = [
    ...new Set(
      items.map((item) => Number(item.medicineId))
    )
  ];

  const existingMedicines = await Medicine.findAll({
    where: {
      id: medicineIds
    },
    attributes: ["id"]
  });

  const existingMedicineIds = new Set(
    existingMedicines.map((medicine) => Number(medicine.id))
  );

  for (const item of items) {
    if (!existingMedicineIds.has(Number(item.medicineId))) {
      throw createHttpError(
        `Medicine with ID ${item.medicineId} does not exist.`,
        400
      );
    }
  }

  // ------------------------------------------
  // Calculate purchase total on the server
  // ------------------------------------------

  const totalAmount = items.reduce(
    (total, item) => {
      return (
        total +
        Number(item.quantity) * Number(item.unitPrice)
      );
    },
    0
  );

  // ------------------------------------------
  // Handle automatic and manual purchase numbers
  // ------------------------------------------

  const suppliedPurchaseNumber =
    typeof purchaseNumber === "string"
      ? purchaseNumber.trim()
      : "";

  if (
    suppliedPurchaseNumber &&
    suppliedPurchaseNumber.length > 50
  ) {
    throw createHttpError(
      "The purchase number cannot exceed 50 characters.",
      400
    );
  }

  // Existing clients can still submit their own purchase
  // number. New frontend requests can omit it entirely.
  const shouldGenerateNumber = !suppliedPurchaseNumber;

  if (suppliedPurchaseNumber) {
    const existingPurchase = await Purchase.findOne({
      where: {
        purchaseNumber: suppliedPurchaseNumber
      }
    });

    if (existingPurchase) {
      throw createHttpError(
        "A purchase with this purchase number already exists.",
        409
      );
    }
  }

  // Retry only when an automatically generated number
  // collides with the database's unique constraint.
  const maxAttempts = shouldGenerateNumber ? 5 : 1;

  let createdPurchase = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transaction = await sequelize.transaction();

    const finalPurchaseNumber = shouldGenerateNumber
      ? generatePurchaseNumber()
      : suppliedPurchaseNumber;

    try {
      const purchase = await Purchase.create(
        {
          purchaseNumber: finalPurchaseNumber,
          purchaseDate: purchaseDate || new Date(),
          totalAmount,
          status: "pending",
          notes: notes || null,
          supplierId: Number(supplierId),
          createdBy: userId
        },
        { transaction }
      );

      const purchaseItems = items.map((item) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        return {
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          purchaseId: purchase.id,
          medicineId: Number(item.medicineId)
        };
      });

      await PurchaseItem.bulkCreate(
        purchaseItems,
        { transaction }
      );

      await transaction.commit();

      createdPurchase = purchase;
      break;
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }

      const canRetry =
        shouldGenerateNumber &&
        isUniqueConstraintError(error) &&
        attempt < maxAttempts;

      if (canRetry) {
        continue;
      }

      if (isUniqueConstraintError(error)) {
        throw createHttpError(
          "A purchase with this purchase number already exists. Please try again.",
          409
        );
      }

      throw error;
    }
  }

  if (!createdPurchase) {
    throw createHttpError(
      "Unable to generate a unique purchase number. Please try again.",
      503
    );
  }

  // ------------------------------------------
  // Record audit log after successful creation
  // ------------------------------------------

  try {
    await createAuditLog({
      userId,
      action: "purchase",
      module: "purchases",
      description:
        `Purchase ${createdPurchase.purchaseNumber} created for GH₵${Number(
          createdPurchase.totalAmount
        ).toFixed(2)}.`,
      entityType: "Purchase",
      entityId: createdPurchase.id,
      ipAddress,
      userAgent
    });
  } catch (auditError) {
    console.error(
      "Purchase creation audit log error:",
      auditError.message
    );
  }

  return Purchase.findByPk(createdPurchase.id, {
    include: purchaseIncludes
  });
};

// ======================================================
// Get All Purchases
// ======================================================

const getAllPurchases = async () =>
  Purchase.findAll({
    include: purchaseIncludes,
    order: [["purchaseDate", "DESC"]]
  });

// ======================================================
// Get Purchase By ID
// ======================================================

const getPurchaseById = async (id) => {
  const purchase = await Purchase.findByPk(id, {
    include: purchaseIncludes
  });

  if (!purchase) {
    throw createHttpError(
      "Purchase not found.",
      404
    );
  }

  return purchase;
};

// ======================================================
// Update Purchase
// ======================================================

const updatePurchase = async (id, data) => {
  const purchase = await Purchase.findByPk(id);

  if (!purchase) {
    throw createHttpError(
      "Purchase not found.",
      404
    );
  }

  if (purchase.status === "received") {
    throw createHttpError(
      "Received purchases cannot be edited.",
      400
    );
  }

  if (purchase.status === "cancelled") {
    throw createHttpError(
      "Cancelled purchases cannot be edited.",
      400
    );
  }

  // Purchase numbers should not be changed during an edit.
  const {
    purchaseNumber,
    ...editableData
  } = data;

  await purchase.update(editableData);

  return purchase;
};

// ======================================================
// Cancel Purchase
// ======================================================

const cancelPurchase = async (id) => {
  const purchase = await Purchase.findByPk(id);

  if (!purchase) {
    throw createHttpError(
      "Purchase not found.",
      404
    );
  }

  if (purchase.status === "received") {
    throw createHttpError(
      "A received purchase cannot be cancelled.",
      400
    );
  }

  if (purchase.status === "cancelled") {
    throw createHttpError(
      "This purchase is already cancelled.",
      400
    );
  }

  await purchase.update({
    status: "cancelled"
  });

  return purchase;
};

// ======================================================
// Receive Purchase
// ======================================================

const receivePurchase = async (
  purchaseId,
  data,
  userId,
  requestMetadata = {}
) => {
  const {
    ipAddress = null,
    userAgent = null
  } = requestMetadata;

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw createHttpError(
      "Provide the purchase items being received.",
      400
    );
  }

  const transaction = await sequelize.transaction();

  let receivedPurchase;

  try {
    const purchase = await Purchase.findByPk(
      purchaseId,
      {
        include: [
          {
            model: PurchaseItem,
            as: "items"
          }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      }
    );

    if (!purchase) {
      throw createHttpError(
        "Purchase not found.",
        404
      );
    }

    if (purchase.status !== "pending") {
      throw createHttpError(
        `Purchase cannot be received because its current status is "${purchase.status}".`,
        400
      );
    }

    if (data.items.length !== purchase.items.length) {
      throw createHttpError(
        "All purchase items must be received before completing the purchase.",
        400
      );
    }

    const receivedPurchaseItemIds = new Set();

    for (const receivedItem of data.items) {
      const purchaseItemId = Number(
        receivedItem.purchaseItemId
      );

      if (
        !Number.isInteger(purchaseItemId) ||
        purchaseItemId <= 0
      ) {
        throw createHttpError(
          "Every received item must reference a valid purchase item.",
          400
        );
      }

      if (receivedPurchaseItemIds.has(purchaseItemId)) {
        throw createHttpError(
          `Purchase item ${purchaseItemId} was supplied more than once.`,
          400
        );
      }

      receivedPurchaseItemIds.add(purchaseItemId);

      const purchaseItem = purchase.items.find(
        (item) => Number(item.id) === purchaseItemId
      );

      if (!purchaseItem) {
        throw createHttpError(
          `Purchase item ${purchaseItemId} does not belong to purchase ${purchaseId}.`,
          400
        );
      }

      const receivedQuantity = Number(
        receivedItem.quantity
      );

      if (
        !Number.isInteger(receivedQuantity) ||
        receivedQuantity <= 0
      ) {
        throw createHttpError(
          "Received quantities must be positive whole numbers.",
          400
        );
      }

      if (receivedQuantity > Number(purchaseItem.quantity)) {
        throw createHttpError(
          `Received quantity for purchase item ${purchaseItem.id} cannot exceed the ordered quantity of ${purchaseItem.quantity}.`,
          400
        );
      }

      const medicine = await Medicine.findByPk(
        purchaseItem.medicineId,
        { transaction }
      );

      if (!medicine) {
        throw createHttpError(
          `Medicine with ID ${purchaseItem.medicineId} does not exist.`,
          400
        );
      }

      const purchasePrice = Number(
        purchaseItem.unitPrice
      );

      const sellingPrice = Number(
        receivedItem.sellingPrice
      );

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        throw createHttpError(
          `Selling price for ${medicine.name} must be a valid non-negative number.`,
          400
        );
      }

      if (sellingPrice < purchasePrice) {
        throw createHttpError(
          `Selling price for ${medicine.name} cannot be lower than the purchase price.`,
          400
        );
      }

      const batchNumber =
        typeof receivedItem.batchNumber === "string"
          ? receivedItem.batchNumber.trim()
          : "";

      if (!batchNumber) {
        throw createHttpError(
          `A batch number is required for ${medicine.name}.`,
          400
        );
      }

      const expiryDate = new Date(
        receivedItem.expiryDate
      );

      if (
        !receivedItem.expiryDate ||
        Number.isNaN(expiryDate.getTime())
      ) {
        throw createHttpError(
          `Invalid expiry date for ${medicine.name}.`,
          400
        );
      }

      if (expiryDate <= new Date()) {
        throw createHttpError(
          `Expiry date for ${medicine.name} must be in the future.`,
          400
        );
      }

      let manufactureDate = null;

      if (receivedItem.manufactureDate) {
        manufactureDate = new Date(
          receivedItem.manufactureDate
        );

        if (Number.isNaN(manufactureDate.getTime())) {
          throw createHttpError(
            `Invalid manufacture date for ${medicine.name}.`,
            400
          );
        }

        if (manufactureDate > expiryDate) {
          throw createHttpError(
            `Manufacture date cannot be later than expiry date for ${medicine.name}.`,
            400
          );
        }
      }

      const existingBatch = await Batch.findOne({
        where: {
          batchNumber
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existingBatch) {
        if (
          Number(existingBatch.medicineId) !==
          Number(purchaseItem.medicineId)
        ) {
          throw createHttpError(
            `Batch ${batchNumber} already belongs to another medicine.`,
            409
          );
        }

        // Do not combine stock from batches with different
        // expiry dates. Doing so can hide expiry risk.
        const existingExpiry = new Date(
          existingBatch.expiryDate
        );

        if (
          existingExpiry.toISOString().slice(0, 10) !==
          expiryDate.toISOString().slice(0, 10)
        ) {
          throw createHttpError(
            `Batch ${batchNumber} already exists with a different expiry date.`,
            409
          );
        }

        await existingBatch.update(
          {
            quantity:
              Number(existingBatch.quantity) +
              receivedQuantity,
            purchasePrice,
            sellingPrice,
            manufactureDate:
              receivedItem.manufactureDate ||
              existingBatch.manufactureDate ||
              null,
            supplierId: purchase.supplierId
          },
          { transaction }
        );
      } else {
        await Batch.create(
          {
            batchNumber,
            quantity: receivedQuantity,
            purchasePrice,
            sellingPrice,
            expiryDate: receivedItem.expiryDate,
            manufactureDate:
              receivedItem.manufactureDate || null,
            medicineId: purchaseItem.medicineId,
            supplierId: purchase.supplierId
          },
          { transaction }
        );
      }
    }

    await purchase.update(
      {
        status: "received"
      },
      { transaction }
    );

    await transaction.commit();

    receivedPurchase = purchase;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }

  // ------------------------------------------
  // Record receiving audit log
  // ------------------------------------------

  try {
    await createAuditLog({
      userId,
      action: "purchase",
      module: "purchases",
      description:
        `Purchase ${receivedPurchase.purchaseNumber} received for GH₵${Number(
          receivedPurchase.totalAmount
        ).toFixed(2)}.`,
      entityType: "Purchase",
      entityId: receivedPurchase.id,
      ipAddress,
      userAgent
    });
  } catch (auditError) {
    console.error(
      "Purchase receiving audit log error:",
      auditError.message
    );
  }

  return Purchase.findByPk(receivedPurchase.id, {
    include: purchaseIncludes
  });
};

// ======================================================
// Exports
// ======================================================

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  receivePurchase
};

const { Op } = require("sequelize");

const sequelize = require("../config/database");
const { Medicine, Batch, Category, Supplier } = require("../models");
const { createAuditLog } = require("./auditLogService");

// ======================================================
// Helpers
// ======================================================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const todayString = () => new Date().toISOString().split("T")[0];

const isBatchExpired = (expiryDate) =>
  Boolean(expiryDate) && expiryDate < todayString();

const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;

  const today = new Date(`${todayString()}T00:00:00`);
  const expiry = new Date(`${expiryDate}T00:00:00`);

  return Math.ceil((expiry.getTime() - today.getTime()) / MS_PER_DAY);
};

const roundMoney = (value) => Number(Number(value).toFixed(2));

// Shared include blocks so every query returns the same shape.
const supplierAttributes = ["id", "name"];

const medicineBriefAttributes = [
  "id",
  "name",
  "genericName",
  "sku",
  "dosageForm",
  "strength"
];

const categoryAttributes = ["id", "name"];

const fullBatchAttributes = [
  "id",
  "batchNumber",
  "quantity",
  "purchasePrice",
  "sellingPrice",
  "expiryDate",
  "manufactureDate",
  "supplierId"
];

const formatBatch = (batch) => ({
  id: batch.id,
  batchNumber: batch.batchNumber,
  quantity: Number(batch.quantity),
  purchasePrice: Number(batch.purchasePrice),
  sellingPrice: Number(batch.sellingPrice),
  expiryDate: batch.expiryDate,
  manufactureDate: batch.manufactureDate,
  isExpired: isBatchExpired(batch.expiryDate),
  daysUntilExpiry: daysUntilExpiry(batch.expiryDate),
  supplier: batch.supplier
    ? { id: batch.supplier.id, name: batch.supplier.name }
    : null
});

// ======================================================
// Get Inventory Summary
// ======================================================

const getInventorySummary = async () => {
  const medicines = await Medicine.findAll({
    where: { isActive: true },
    include: [
      { model: Category, as: "category", attributes: categoryAttributes },
      {
        model: Batch,
        as: "batches",
        attributes: fullBatchAttributes,
        include: [
          { model: Supplier, as: "supplier", attributes: supplierAttributes }
        ]
      }
    ],
    order: [["name", "ASC"]]
  });

  let totalUnits = 0;
  let totalInventoryValue = 0;
  let totalRetailValue = 0;

  const inventory = medicines.map((medicine) => {
    const allBatches = medicine.batches || [];
    const usableBatches = allBatches.filter(
      (batch) => !isBatchExpired(batch.expiryDate)
    );

    const currentStock = usableBatches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    const inventoryValue = usableBatches.reduce(
      (sum, batch) =>
        sum + Number(batch.quantity) * Number(batch.purchasePrice),
      0
    );

    const retailValue = usableBatches.reduce(
      (sum, batch) =>
        sum + Number(batch.quantity) * Number(batch.sellingPrice),
      0
    );

    const expiredQuantity = allBatches
      .filter((batch) => isBatchExpired(batch.expiryDate))
      .reduce((sum, batch) => sum + Number(batch.quantity), 0);

    totalUnits += currentStock;
    totalInventoryValue += inventoryValue;
    totalRetailValue += retailValue;

    let stockStatus = "in_stock";
    if (currentStock === 0) stockStatus = "out_of_stock";
    else if (currentStock <= medicine.reorderLevel) stockStatus = "low_stock";

    return {
      medicineId: medicine.id,
      medicineName: medicine.name,
      genericName: medicine.genericName,
      brandName: medicine.brandName,
      dosageForm: medicine.dosageForm,
      strength: medicine.strength,
      sku: medicine.sku,
      reorderLevel: medicine.reorderLevel,
      currentStock,
      expiredQuantity,
      stockStatus,
      inventoryValue: roundMoney(inventoryValue),
      retailValue: roundMoney(retailValue),
      potentialProfit: roundMoney(retailValue - inventoryValue),
      batches: allBatches.map(formatBatch)
    };
  });

  const lowStock = inventory.filter((i) => i.stockStatus === "low_stock");
  const outOfStock = inventory.filter((i) => i.stockStatus === "out_of_stock");

  return {
    totalMedicines: medicines.length,
    totalUnits,
    totalInventoryValue: roundMoney(totalInventoryValue),
    totalRetailValue: roundMoney(totalRetailValue),
    potentialProfit: roundMoney(totalRetailValue - totalInventoryValue),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    inventory
  };
};

// ======================================================
// Get Low Stock Medicines
// ======================================================

const getLowStockMedicines = async () => {
  const medicines = await Medicine.findAll({
    where: { isActive: true },
    include: [
      {
        model: Batch,
        as: "batches",
        attributes: ["id", "batchNumber", "quantity", "expiryDate"]
      },
      { model: Category, as: "category", attributes: categoryAttributes }
    ],
    order: [["name", "ASC"]]
  });

  return medicines
    .map((medicine) => {
      const usableBatches = (medicine.batches || []).filter(
        (batch) => !isBatchExpired(batch.expiryDate)
      );

      const currentStock = usableBatches.reduce(
        (sum, batch) => sum + Number(batch.quantity),
        0
      );

      return {
        medicineId: medicine.id,
        medicineName: medicine.name,
        sku: medicine.sku,
        category: medicine.category ? medicine.category.name : null,
        reorderLevel: medicine.reorderLevel,
        currentStock
      };
    })
    .filter((m) => m.currentStock <= m.reorderLevel);
};

// ======================================================
// Get Expiring Batches
// ======================================================

const getExpiringBatches = async (days = 90) => {
  const today = todayString();

  const future = new Date();
  future.setDate(future.getDate() + Number(days));
  const futureDate = future.toISOString().split("T")[0];

  const batches = await Batch.findAll({
    where: {
      quantity: { [Op.gt]: 0 },
      expiryDate: { [Op.between]: [today, futureDate] }
    },
    include: [
      {
        model: Medicine,
        as: "medicine",
        attributes: medicineBriefAttributes
      },
      { model: Supplier, as: "supplier", attributes: supplierAttributes }
    ],
    order: [["expiryDate", "ASC"]]
  });

  return batches.map((batch) => ({
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    quantity: Number(batch.quantity),
    expiryDate: batch.expiryDate,
    daysUntilExpiry: daysUntilExpiry(batch.expiryDate),
    medicine: batch.medicine,
    supplier: batch.supplier
  }));
};

// ======================================================
// Get Expired Batches
// ======================================================

const getExpiredBatches = async () => {
  const today = todayString();

  const batches = await Batch.findAll({
    where: { expiryDate: { [Op.lt]: today } },
    include: [
      {
        model: Medicine,
        as: "medicine",
        attributes: medicineBriefAttributes
      },
      { model: Supplier, as: "supplier", attributes: supplierAttributes }
    ],
    order: [["expiryDate", "ASC"]]
  });

  return batches.map((batch) => ({
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    quantity: Number(batch.quantity),
    expiryDate: batch.expiryDate,
    daysUntilExpiry: daysUntilExpiry(batch.expiryDate),
    medicine: batch.medicine,
    supplier: batch.supplier
  }));
};

// ======================================================
// Get Stock By Medicine
// ======================================================

const getStockByMedicine = async (medicineId) => {
  const medicine = await Medicine.findByPk(medicineId, {
    include: [
      { model: Category, as: "category", attributes: categoryAttributes },
      {
        model: Batch,
        as: "batches",
        include: [
          { model: Supplier, as: "supplier", attributes: supplierAttributes }
        ]
      }
    ]
  });

  if (!medicine) {
    throw createHttpError("Medicine not found.", 404);
  }

  const batches = medicine.batches || [];
  const usableBatches = batches.filter(
    (batch) => !isBatchExpired(batch.expiryDate)
  );

  const currentStock = usableBatches.reduce(
    (sum, batch) => sum + Number(batch.quantity),
    0
  );

  const inventoryValue = usableBatches.reduce(
    (sum, batch) =>
      sum + Number(batch.quantity) * Number(batch.purchasePrice),
    0
  );

  const retailValue = usableBatches.reduce(
    (sum, batch) =>
      sum + Number(batch.quantity) * Number(batch.sellingPrice),
    0
  );

  return {
    medicine: {
      id: medicine.id,
      name: medicine.name,
      genericName: medicine.genericName,
      brandName: medicine.brandName,
      dosageForm: medicine.dosageForm,
      strength: medicine.strength,
      sku: medicine.sku,
      reorderLevel: medicine.reorderLevel,
      category: medicine.category
    },
    currentStock,
    stockStatus:
      currentStock === 0
        ? "out_of_stock"
        : currentStock <= medicine.reorderLevel
          ? "low_stock"
          : "in_stock",
    inventoryValue: roundMoney(inventoryValue),
    retailValue: roundMoney(retailValue),
    potentialProfit: roundMoney(retailValue - inventoryValue),
    batches: batches.map(formatBatch)
  };
};

// ======================================================
// Adjust Stock
// ======================================================

const adjustStock = async (data, userId, requestMetadata = {}) => {
  const { batchId, quantityChange, reason } = data;
  const { ipAddress = null, userAgent = null } = requestMetadata;

  const parsedBatchId = Number(batchId);
  const parsedQuantityChange = Number(quantityChange);

  if (!Number.isInteger(parsedBatchId) || parsedBatchId <= 0) {
    throw createHttpError("Batch ID must be a positive whole number.", 400);
  }

  if (
    !Number.isInteger(parsedQuantityChange) ||
    parsedQuantityChange === 0
  ) {
    throw createHttpError(
      "Quantity change must be a non-zero whole number.",
      400
    );
  }

  if (typeof reason !== "string" || reason.trim().length < 3) {
    throw createHttpError("A valid adjustment reason is required.", 400);
  }

  const transaction = await sequelize.transaction();

  try {
    const batch = await Batch.findByPk(parsedBatchId, {
      include: [
        { model: Medicine, as: "medicine", attributes: ["id", "name", "sku"] }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!batch) {
      throw createHttpError("Batch not found.", 404);
    }

    const oldQuantity = Number(batch.quantity);
    const newQuantity = oldQuantity + parsedQuantityChange;

    if (newQuantity < 0) {
      throw createHttpError(
        `Stock adjustment would result in negative stock. Current quantity is ${oldQuantity}.`,
        400
      );
    }

    await batch.update({ quantity: newQuantity }, { transaction });

    await transaction.commit();

    try {
      await createAuditLog({
        userId,
        action: "stock_adjustment",
        module: "inventory",
        description: `Stock adjusted for ${batch.medicine.name}: ${oldQuantity} → ${newQuantity} units. Change: ${parsedQuantityChange > 0 ? "+" : ""}${parsedQuantityChange}. Reason: ${reason.trim()}.`,
        entityType: "Batch",
        entityId: batch.id,
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      console.error(
        "Stock adjustment audit log error:",
        auditError.message
      );
    }

    const updatedBatch = await Batch.findByPk(batch.id, {
      include: [
        { model: Medicine, as: "medicine", attributes: ["id", "name", "sku"] },
        { model: Supplier, as: "supplier", attributes: supplierAttributes }
      ]
    });

    return {
      batch: updatedBatch,
      adjustment: {
        oldQuantity,
        quantityChange: parsedQuantityChange,
        newQuantity,
        reason: reason.trim()
      }
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = {
  getInventorySummary,
  getLowStockMedicines,
  getExpiringBatches,
  getExpiredBatches,
  getStockByMedicine,
  adjustStock
};
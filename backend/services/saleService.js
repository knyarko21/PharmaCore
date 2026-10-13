
const { Op } = require("sequelize");

const sequelize = require("../config/database");
const {
  Sale,
  SaleItem,
  Payment,
  Medicine,
  Batch,
  Customer,
  User,
  Prescription,
  PrescriptionItem
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

const roundMoney = (value) => Number(Number(value).toFixed(2));

const todayString = () => new Date().toISOString().split("T")[0];

const generatePaymentReference = () =>
  `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const userAttributes = ["id", "firstName", "lastName", "email", "role"];

const saleIncludes = [
  { model: Customer, as: "customer" },
  { model: User, as: "creator", attributes: userAttributes },
  {
    model: SaleItem,
    as: "items",
    include: [
      { model: Medicine, as: "medicine" },
      { model: Batch, as: "batch" },
      {
        model: PrescriptionItem,
        as: "prescriptionItem",
        include: [{ model: Prescription, as: "prescription" }]
      }
    ]
  },
  { model: Payment, as: "payments" }
];

// ----------------------------------------------
// Recalculate a prescription's status based on
// how much of each item has been dispensed.
// ----------------------------------------------

const updatePrescriptionStatus = async (
  prescriptionId,
  transaction
) => {
  const prescriptionItems = await PrescriptionItem.findAll({
    where: { prescriptionId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (prescriptionItems.length === 0) return;

  const allFullyDispensed = prescriptionItems.every(
    (item) =>
      Number(item.dispensedQuantity) >= Number(item.quantity)
  );

  const partiallyDispensed = prescriptionItems.some(
    (item) => Number(item.dispensedQuantity) > 0
  );

  let status = "active";
  if (allFullyDispensed) status = "dispensed";
  else if (partiallyDispensed) status = "partially_dispensed";

  await Prescription.update(
    { status },
    { where: { id: prescriptionId }, transaction }
  );
};

// ======================================================
// Create Sale
// ======================================================

const createSale = async (data, userId, requestMetadata = {}) => {
  const {
    saleNumber,
    saleDate,
    customerId,
    discount = 0,
    tax = 0,
    notes,
    items,
    payment
  } = data;

  if (!saleNumber) throw createHttpError("Sale number is required.", 400);

  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(
      "A sale must contain at least one item.",
      400
    );
  }

  if (!payment) {
    throw createHttpError("Payment information is required.", 400);
  }

  const saleDiscount = roundMoney(discount);
  if (saleDiscount < 0) {
    throw createHttpError("Discount cannot be negative.", 400);
  }

  const saleTax = roundMoney(tax);
  if (saleTax < 0) {
    throw createHttpError("Tax cannot be negative.", 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw createHttpError(
      "The authenticated user does not exist.",
      401
    );
  }

  if (customerId !== undefined && customerId !== null) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw createHttpError(
        "The selected customer does not exist.",
        400
      );
    }
  }

  const existingSale = await Sale.findOne({ where: { saleNumber } });
  if (existingSale) {
    throw createHttpError(
      "A sale with this sale number already exists.",
      409
    );
  }

  const paymentMethod = payment.paymentMethod;
  const allowedPaymentMethods = [
    "cash",
    "mobile_money",
    "card",
    "bank_transfer"
  ];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw createHttpError("Invalid payment method.", 400);
  }

  const transaction = await sequelize.transaction();
  let transactionCommitted = false;

  try {
    const saleItemsToCreate = [];
    let subtotal = 0;
    const prescriptionDispensingMap = new Map();

    for (const item of items) {
      const medicineId = Number(item.medicineId);
      const requestedQuantity = Number(item.quantity);
      const itemDiscount = roundMoney(item.discount || 0);
      const prescriptionItemId = item.prescriptionItemId
        ? Number(item.prescriptionItemId)
        : null;

      if (!Number.isInteger(medicineId) || medicineId <= 0) {
        throw createHttpError(
          "Each sale item must contain a valid medicine ID.",
          400
        );
      }

      if (
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        throw createHttpError(
          `Invalid quantity for medicine ID ${medicineId}.`,
          400
        );
      }

      if (itemDiscount < 0) {
        throw createHttpError(
          `Discount cannot be negative for medicine ID ${medicineId}.`,
          400
        );
      }

      if (
        prescriptionItemId !== null &&
        (!Number.isInteger(prescriptionItemId) ||
          prescriptionItemId <= 0)
      ) {
        throw createHttpError(
          `Invalid prescription item ID for medicine ID ${medicineId}.`,
          400
        );
      }

      const medicine = await Medicine.findByPk(medicineId, {
        transaction
      });

      if (!medicine) {
        throw createHttpError(
          `Medicine with ID ${medicineId} does not exist.`,
          400
        );
      }

      let prescriptionItem = null;

      if (medicine.isPrescriptionRequired) {
        if (customerId === undefined || customerId === null) {
          throw createHttpError(
            `${medicine.name} requires a prescription and a customer must be selected.`,
            400
          );
        }

        if (!prescriptionItemId) {
          throw createHttpError(
            `${medicine.name} requires a valid prescription.`,
            400
          );
        }

        prescriptionItem = await PrescriptionItem.findByPk(
          prescriptionItemId,
          { transaction, lock: transaction.LOCK.UPDATE }
        );

        if (!prescriptionItem) {
          throw createHttpError(
            `Prescription item with ID ${prescriptionItemId} does not exist.`,
            400
          );
        }

        if (Number(prescriptionItem.medicineId) !== medicineId) {
          throw createHttpError(
            `Prescription item ${prescriptionItemId} is not for ${medicine.name}.`,
            400
          );
        }

        const prescription = await Prescription.findByPk(
          prescriptionItem.prescriptionId,
          { transaction, lock: transaction.LOCK.UPDATE }
        );

        if (!prescription) {
          throw createHttpError(
            "The prescription linked to this medicine does not exist.",
            400
          );
        }

        if (Number(prescription.customerId) !== Number(customerId)) {
          throw createHttpError(
            "The prescription does not belong to the selected customer.",
            400
          );
        }

        const allowedPrescriptionStatuses = [
          "active",
          "partially_dispensed"
        ];

        if (!allowedPrescriptionStatuses.includes(prescription.status)) {
          throw createHttpError(
            `This prescription cannot be used because its current status is ${prescription.status}.`,
            400
          );
        }

        const remaining =
          Number(prescriptionItem.quantity) -
          Number(prescriptionItem.dispensedQuantity);

        if (remaining <= 0) {
          throw createHttpError(
            `No quantity remains on prescription ${prescription.prescriptionNumber} for ${medicine.name}.`,
            400
          );
        }

        if (requestedQuantity > remaining) {
          throw createHttpError(
            `Prescription quantity exceeded for ${medicine.name}. Remaining quantity: ${remaining}, requested: ${requestedQuantity}.`,
            400
          );
        }

        const tracked =
          prescriptionDispensingMap.get(prescriptionItemId) || 0;

        prescriptionDispensingMap.set(
          prescriptionItemId,
          tracked + requestedQuantity
        );
      } else if (prescriptionItemId) {
        const suppliedPrescriptionItem =
          await PrescriptionItem.findByPk(prescriptionItemId, {
            transaction
          });

        if (!suppliedPrescriptionItem) {
          throw createHttpError(
            `Prescription item with ID ${prescriptionItemId} does not exist.`,
            400
          );
        }

        if (
          Number(suppliedPrescriptionItem.medicineId) !== medicineId
        ) {
          throw createHttpError(
            `Prescription item ${prescriptionItemId} is not for ${medicine.name}.`,
            400
          );
        }

        prescriptionItem = suppliedPrescriptionItem;
      }

      const today = todayString();

      const batches = await Batch.findAll({
        where: {
          medicineId,
          quantity: { [Op.gt]: 0 },
          expiryDate: { [Op.gte]: today }
        },
        order: [
          ["expiryDate", "ASC"],
          ["id", "ASC"]
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const availableQuantity = batches.reduce(
        (sum, batch) => sum + Number(batch.quantity),
        0
      );

      if (availableQuantity < requestedQuantity) {
        throw createHttpError(
          `Insufficient stock for ${medicine.name}. Available: ${availableQuantity}, requested: ${requestedQuantity}.`,
          400
        );
      }

      let remainingQuantity = requestedQuantity;

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const availableInBatch = Number(batch.quantity);
        const quantityFromBatch = Math.min(
          availableInBatch,
          remainingQuantity
        );

        const unitPrice = roundMoney(batch.sellingPrice);
        const grossAmount = roundMoney(quantityFromBatch * unitPrice);
        const discountForBatch = roundMoney(
          (itemDiscount * quantityFromBatch) / requestedQuantity
        );
        const lineTotal = roundMoney(grossAmount - discountForBatch);

        if (lineTotal < 0) {
          throw createHttpError(
            `Discount cannot exceed the item value for ${medicine.name}.`,
            400
          );
        }

        batch.quantity = availableInBatch - quantityFromBatch;
        await batch.save({ transaction });

        saleItemsToCreate.push({
          quantity: quantityFromBatch,
          unitPrice,
          discount: discountForBatch,
          totalPrice: lineTotal,
          medicineId,
          batchId: batch.id,
          prescriptionItemId: prescriptionItem
            ? prescriptionItem.id
            : null
        });

        subtotal = roundMoney(subtotal + grossAmount);
        remainingQuantity -= quantityFromBatch;
      }
    }

    const totalRequested = items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    const totalAllocated = saleItemsToCreate.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    if (totalAllocated !== totalRequested) {
      throw createHttpError(
        "The requested stock could not be fully allocated.",
        400
      );
    }

    const affectedPrescriptionIds = new Set();

    for (const [prescriptionItemId, quantityToDispense] of
      prescriptionDispensingMap.entries()) {
      const prescriptionItem = await PrescriptionItem.findByPk(
        prescriptionItemId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!prescriptionItem) {
        throw createHttpError(
          `Prescription item with ID ${prescriptionItemId} no longer exists.`,
          400
        );
      }

      const newDispensed =
        Number(prescriptionItem.dispensedQuantity) +
        Number(quantityToDispense);

      if (newDispensed > Number(prescriptionItem.quantity)) {
        throw createHttpError(
          "The prescription quantity would be exceeded.",
          400
        );
      }

      prescriptionItem.dispensedQuantity = newDispensed;
      await prescriptionItem.save({ transaction });

      affectedPrescriptionIds.add(prescriptionItem.prescriptionId);
    }

    for (const prescriptionId of affectedPrescriptionIds) {
      await updatePrescriptionStatus(prescriptionId, transaction);
    }

    if (saleDiscount > subtotal) {
      throw createHttpError(
        "Sale discount cannot exceed the subtotal.",
        400
      );
    }

    const totalAmount = roundMoney(subtotal - saleDiscount + saleTax);

    const paymentAmount = roundMoney(Number(payment.amount));

    if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
      throw createHttpError(
        "Payment amount must be a valid non-negative number.",
        400
      );
    }

    if (paymentAmount !== totalAmount) {
      throw createHttpError(
        `Payment amount must equal the sale total of ${totalAmount.toFixed(2)}.`,
        400
      );
    }

    const sale = await Sale.create(
      {
        saleNumber,
        saleDate: saleDate || new Date(),
        subtotal,
        discount: saleDiscount,
        tax: saleTax,
        totalAmount,
        status: "completed",
        notes: notes || null,
        customerId: customerId || null,
        createdBy: userId
      },
      { transaction }
    );

    const saleItemsWithSaleId = saleItemsToCreate.map((item) => ({
      ...item,
      saleId: sale.id
    }));

    await SaleItem.bulkCreate(saleItemsWithSaleId, { transaction });

    const paymentReference =
      payment.paymentReference || generatePaymentReference();

    await Payment.create(
      {
        paymentReference,
        amount: paymentAmount,
        paymentMethod,
        status: payment.status || "completed",
        transactionReference: payment.transactionReference || null,
        notes: payment.notes || null,
        paidAt: payment.paidAt || new Date(),
        saleId: sale.id
      },
      { transaction }
    );

    await transaction.commit();
    transactionCommitted = true;

    // ----------------------------------------------
    // Audit log — field names aligned with auditLogService
    // ----------------------------------------------

    try {
      const { ipAddress = null, userAgent = null } = requestMetadata;

      await createAuditLog({
        userId,
        action: "sale",
        module: "sales",
        description: `Sale ${sale.saleNumber} completed for GH₵${totalAmount.toFixed(2)}.`,
        entityType: "Sale",
        entityId: sale.id,
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      console.error("Sale audit log failed:", auditError.message);
    }

    return Sale.findByPk(sale.id, { include: saleIncludes });
  } catch (error) {
    if (!transactionCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

// ======================================================
// Get All Sales
// ======================================================

const getAllSales = async () =>
  Sale.findAll({
    include: saleIncludes,
    order: [
      ["saleDate", "DESC"],
      ["id", "DESC"]
    ]
  });

// ======================================================
// Get Sale By ID
// ======================================================

const getSaleById = async (id) => {
  const sale = await Sale.findByPk(id, { include: saleIncludes });

  if (!sale) {
    throw createHttpError("Sale not found.", 404);
  }

  return sale;
};

// ======================================================
// Cancel Sale
// ======================================================

const cancelSale = async (id, userId, requestMetadata = {}) => {
  const transaction = await sequelize.transaction();
  let transactionCommitted = false;

  try {
    const sale = await Sale.findByPk(id, {
      include: [{ model: SaleItem, as: "items" }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!sale) throw createHttpError("Sale not found.", 404);

    if (sale.status !== "completed") {
      throw createHttpError(
        `This sale cannot be cancelled because its current status is ${sale.status}.`,
        400
      );
    }

    const affectedPrescriptionIds = new Set();

    for (const item of sale.items) {
      const batch = await Batch.findByPk(item.batchId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!batch) {
        throw createHttpError(
          `Batch with ID ${item.batchId} no longer exists.`,
          400
        );
      }

      batch.quantity =
        Number(batch.quantity) + Number(item.quantity);
      await batch.save({ transaction });

      if (item.prescriptionItemId) {
        const prescriptionItem = await PrescriptionItem.findByPk(
          item.prescriptionItemId,
          { transaction, lock: transaction.LOCK.UPDATE }
        );

        if (!prescriptionItem) {
          throw createHttpError(
            `Prescription item with ID ${item.prescriptionItemId} no longer exists.`,
            400
          );
        }

        const newDispensed =
          Number(prescriptionItem.dispensedQuantity) -
          Number(item.quantity);

        prescriptionItem.dispensedQuantity = Math.max(
          0,
          newDispensed
        );

        await prescriptionItem.save({ transaction });

        affectedPrescriptionIds.add(
          prescriptionItem.prescriptionId
        );
      }
    }

    for (const prescriptionId of affectedPrescriptionIds) {
      await updatePrescriptionStatus(prescriptionId, transaction);
    }

    sale.status = "cancelled";
    await sale.save({ transaction });

    await Payment.update(
      { status: "refunded" },
      {
        where: { saleId: sale.id, status: "completed" },
        transaction
      }
    );

    await transaction.commit();
    transactionCommitted = true;

    // ----------------------------------------------
    // Audit log — field names aligned with auditLogService
    // ----------------------------------------------

    try {
      const { ipAddress = null, userAgent = null } = requestMetadata;

      await createAuditLog({
        userId,
        action: "delete",
        module: "sales",
        description: `Sale ${sale.saleNumber} was cancelled and inventory restored.`,
        entityType: "Sale",
        entityId: sale.id,
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      console.error(
        "Sale cancellation audit log failed:",
        auditError.message
      );
    }

    return getSaleById(sale.id);
  } catch (error) {
    if (!transactionCommitted) {
      await transaction.rollback();
    }
    throw error;
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale
};
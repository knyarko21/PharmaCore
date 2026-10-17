
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

const roundMoney = (value) =>
  Number(Number(value).toFixed(2));

const todayString = () =>
  new Date().toISOString().split("T")[0];

const generatePaymentReference = () =>
  `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const userAttributes = [
  "id",
  "firstName",
  "lastName",
  "email",
  "role"
];

const saleIncludes = [
  { model: Customer, as: "customer" },
  {
    model: User,
    as: "creator",
    attributes: userAttributes
  },
  {
    model: SaleItem,
    as: "items",
    include: [
      { model: Medicine, as: "medicine" },
      { model: Batch, as: "batch" },
      {
        model: PrescriptionItem,
        as: "prescriptionItem",
        include: [
          { model: Prescription, as: "prescription" }
        ]
      }
    ]
  },
  { model: Payment, as: "payments" }
];

// ======================================================
// Update prescription status
// ======================================================

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

  if (allFullyDispensed) {
    status = "dispensed";
  } else if (partiallyDispensed) {
    status = "partially_dispensed";
  }

  await Prescription.update(
    { status },
    {
      where: { id: prescriptionId },
      transaction
    }
  );
};

// ======================================================
// Create Sale
// ======================================================

const createSale = async (
  data,
  userId,
  requestMetadata = {}
) => {
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

  // ----------------------------------------------------
  // Validate sale details
  // ----------------------------------------------------

  if (!saleNumber) {
    throw createHttpError(
      "Sale number is required.",
      400
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(
      "A sale must contain at least one item.",
      400
    );
  }

  if (!payment || typeof payment !== "object") {
    throw createHttpError(
      "Payment information is required.",
      400
    );
  }

  const rawDiscount = Number(discount);
  const rawTax = Number(tax);

  if (
    !Number.isFinite(rawDiscount) ||
    rawDiscount < 0
  ) {
    throw createHttpError(
      "Discount must be a valid non-negative amount.",
      400
    );
  }

  if (!Number.isFinite(rawTax) || rawTax < 0) {
    throw createHttpError(
      "Tax must be a valid non-negative amount.",
      400
    );
  }

  const saleDiscount = roundMoney(rawDiscount);
  const saleTax = roundMoney(rawTax);

  // ----------------------------------------------------
  // Validate authenticated user
  // ----------------------------------------------------

  const user = await User.findByPk(userId);

  if (!user) {
    throw createHttpError(
      "The authenticated user does not exist.",
      401
    );
  }

  // ----------------------------------------------------
  // Validate customer
  // A null customerId is allowed for walk-in customers.
  // ----------------------------------------------------

  if (customerId !== undefined && customerId !== null) {
    const customer = await Customer.findByPk(customerId);

    if (!customer) {
      throw createHttpError(
        "The selected customer does not exist.",
        400
      );
    }
  }

  // ----------------------------------------------------
  // Prevent duplicate sale numbers
  // ----------------------------------------------------

  const existingSale = await Sale.findOne({
    where: { saleNumber }
  });

  if (existingSale) {
    throw createHttpError(
      "A sale with this sale number already exists.",
      409
    );
  }

  // ----------------------------------------------------
  // Validate payment method
  // ----------------------------------------------------

  const paymentMethod = payment.paymentMethod;

  const allowedPaymentMethods = [
    "cash",
    "mobile_money",
    "card",
    "bank_transfer"
  ];

  if (!allowedPaymentMethods.includes(paymentMethod)) {
    throw createHttpError(
      "Invalid payment method.",
      400
    );
  }

  const isCashPayment = paymentMethod === "cash";

  // ----------------------------------------------------
  // Start database transaction
  // ----------------------------------------------------

  const transaction = await sequelize.transaction();

  let transactionCommitted = false;

  try {
    const saleItemsToCreate = [];

    let subtotal = 0;

    const prescriptionDispensingMap = new Map();

    // ==================================================
    // Process sale items and allocate inventory
    // ==================================================

    for (const item of items) {
      const medicineId = Number(item.medicineId);
      const requestedQuantity = Number(item.quantity);

      const rawItemDiscount = Number(item.discount || 0);

      const itemDiscount = roundMoney(rawItemDiscount);

      const prescriptionItemId = item.prescriptionItemId
        ? Number(item.prescriptionItemId)
        : null;

      if (
        !Number.isInteger(medicineId) ||
        medicineId <= 0
      ) {
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

      if (
        !Number.isFinite(rawItemDiscount) ||
        rawItemDiscount < 0
      ) {
        throw createHttpError(
          `Discount must be a valid non-negative amount for medicine ID ${medicineId}.`,
          400
        );
      }

      if (
        prescriptionItemId !== null &&
        (
          !Number.isInteger(prescriptionItemId) ||
          prescriptionItemId <= 0
        )
      ) {
        throw createHttpError(
          `Invalid prescription item ID for medicine ID ${medicineId}.`,
          400
        );
      }

      // ----------------------------------------------
      // Confirm medicine exists
      // ----------------------------------------------

      const medicine = await Medicine.findByPk(
        medicineId,
        { transaction }
      );

      if (!medicine) {
        throw createHttpError(
          `Medicine with ID ${medicineId} does not exist.`,
          400
        );
      }

      let prescriptionItem = null;

      // ----------------------------------------------
      // Validate prescription-required medicines
      // ----------------------------------------------

      if (medicine.isPrescriptionRequired) {
        if (
          customerId === undefined ||
          customerId === null
        ) {
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
          {
            transaction,
            lock: transaction.LOCK.UPDATE
          }
        );

        if (!prescriptionItem) {
          throw createHttpError(
            `Prescription item with ID ${prescriptionItemId} does not exist.`,
            400
          );
        }

        if (
          Number(prescriptionItem.medicineId) !== medicineId
        ) {
          throw createHttpError(
            `Prescription item ${prescriptionItemId} is not for ${medicine.name}.`,
            400
          );
        }

        const prescription = await Prescription.findByPk(
          prescriptionItem.prescriptionId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE
          }
        );

        if (!prescription) {
          throw createHttpError(
            "The prescription linked to this medicine does not exist.",
            400
          );
        }

        if (
          Number(prescription.customerId) !== Number(customerId)
        ) {
          throw createHttpError(
            "The prescription does not belong to the selected customer.",
            400
          );
        }

        const allowedPrescriptionStatuses = [
          "active",
          "partially_dispensed"
        ];

        if (
          !allowedPrescriptionStatuses.includes(
            prescription.status
          )
        ) {
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

        // Track quantities across duplicate cart entries
        // that refer to the same prescription item.
        const tracked =
          prescriptionDispensingMap.get(prescriptionItemId) || 0;

        prescriptionDispensingMap.set(
          prescriptionItemId,
          tracked + requestedQuantity
        );
      } else if (prescriptionItemId) {
        // --------------------------------------------
        // If a prescription item was supplied for a
        // non-prescription medicine, validate it.
        // --------------------------------------------

        const suppliedPrescriptionItem =
          await PrescriptionItem.findByPk(
            prescriptionItemId,
            { transaction }
          );

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

      // ----------------------------------------------
      // Get available, non-expired batches.
      // FEFO: First Expiry, First Out.
      // ----------------------------------------------

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
        (sum, batch) =>
          sum + Number(batch.quantity),
        0
      );

      if (availableQuantity < requestedQuantity) {
        throw createHttpError(
          `Insufficient stock for ${medicine.name}. Available: ${availableQuantity}, requested: ${requestedQuantity}.`,
          400
        );
      }

      // ----------------------------------------------
      // Allocate requested quantity across batches
      // ----------------------------------------------

      let remainingQuantity = requestedQuantity;

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const availableInBatch = Number(batch.quantity);

        const quantityFromBatch = Math.min(
          availableInBatch,
          remainingQuantity
        );

        const unitPrice = roundMoney(
          batch.sellingPrice
        );

        const grossAmount = roundMoney(
          quantityFromBatch * unitPrice
        );

        const discountForBatch = roundMoney(
          (itemDiscount * quantityFromBatch) /
          requestedQuantity
        );

        const lineTotal = roundMoney(
          grossAmount - discountForBatch
        );

        if (lineTotal < 0) {
          throw createHttpError(
            `Discount cannot exceed the item value for ${medicine.name}.`,
            400
          );
        }

        // Deduct stock inside the transaction.
        batch.quantity =
          availableInBatch - quantityFromBatch;

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

        subtotal = roundMoney(
          subtotal + grossAmount
        );

        remainingQuantity -= quantityFromBatch;
      }
    }

    // ==================================================
    // Verify all requested quantities were allocated
    // ==================================================

    const totalRequested = items.reduce(
      (sum, item) =>
        sum + Number(item.quantity),
      0
    );

    const totalAllocated = saleItemsToCreate.reduce(
      (sum, item) =>
        sum + Number(item.quantity),
      0
    );

    if (totalAllocated !== totalRequested) {
      throw createHttpError(
        "The requested stock could not be fully allocated.",
        400
      );
    }

    // ==================================================
    // Update prescription dispensing quantities
    // ==================================================

    const affectedPrescriptionIds = new Set();

    for (const [
      prescriptionItemId,
      quantityToDispense
    ] of prescriptionDispensingMap.entries()) {
      const prescriptionItem = await PrescriptionItem.findByPk(
        prescriptionItemId,
        {
          transaction,
          lock: transaction.LOCK.UPDATE
        }
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

      if (
        newDispensed > Number(prescriptionItem.quantity)
      ) {
        throw createHttpError(
          "The prescription quantity would be exceeded.",
          400
        );
      }

      prescriptionItem.dispensedQuantity = newDispensed;

      await prescriptionItem.save({ transaction });

      affectedPrescriptionIds.add(
        prescriptionItem.prescriptionId
      );
    }

    // Recalculate each affected prescription status.
    for (const prescriptionId of affectedPrescriptionIds) {
      await updatePrescriptionStatus(
        prescriptionId,
        transaction
      );
    }

    // ==================================================
    // Calculate sale total
    // ==================================================

    if (saleDiscount > subtotal) {
      throw createHttpError(
        "Sale discount cannot exceed the subtotal.",
        400
      );
    }

    const totalAmount = roundMoney(
      subtotal - saleDiscount + saleTax
    );

    if (
      !Number.isFinite(totalAmount) ||
      totalAmount < 0
    ) {
      throw createHttpError(
        "The calculated sale total is invalid.",
        400
      );
    }

    // ==================================================
    // Validate payment amount
    // ==================================================

    // payment.amount represents the amount handed over
    // by the customer for cash, and the amount charged
    // for non-cash payment methods.
    const paymentAmount = roundMoney(
      Number(payment.amount)
    );

    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {
      throw createHttpError(
        "Payment amount must be a valid positive number.",
        400
      );
    }

    if (isCashPayment) {
      // Cash may exceed the sale total.
      // The difference is the change owed to the customer.
      if (paymentAmount < totalAmount) {
        const shortfall = roundMoney(
          totalAmount - paymentAmount
        );

        throw createHttpError(
          `Cash payment is short by GH₵${shortfall.toFixed(2)}.`,
          400
        );
      }
    } else {
      // Mobile money, card and bank transfer must match
      // the sale total exactly.
      if (paymentAmount !== totalAmount) {
        throw createHttpError(
          `Payment amount must equal the sale total of GH₵${totalAmount.toFixed(2)}.`,
          400
        );
      }
    }

    const changeDue = isCashPayment
      ? roundMoney(paymentAmount - totalAmount)
      : 0;

    // ==================================================
    // Create sale record
    // ==================================================

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

    // ==================================================
    // Create sale item records
    // ==================================================

    const saleItemsWithSaleId = saleItemsToCreate.map(
      (item) => ({
        ...item,
        saleId: sale.id
      })
    );

    await SaleItem.bulkCreate(
      saleItemsWithSaleId,
      { transaction }
    );

    // ==================================================
    // Create payment record
    // ==================================================

    const paymentReference =
      payment.paymentReference ||
      generatePaymentReference();

    // Preserve cash received and change due in the
    // existing Payment.notes field without requiring
    // additional database columns.
    const paymentNotes = [
      payment.notes,
      isCashPayment
        ? `Cash received: GH₵${paymentAmount.toFixed(2)}; Change due: GH₵${changeDue.toFixed(2)}`
        : null
    ]
      .filter(Boolean)
      .join(" | ") || null;

    await Payment.create(
      {
        paymentReference,

        // Record the amount applied to the sale.
        // Do not record excess cash as sale revenue.
        amount: totalAmount,

        paymentMethod,
        status: payment.status || "completed",
        transactionReference:
          payment.transactionReference || null,
        notes: paymentNotes,
        paidAt: payment.paidAt || new Date(),
        saleId: sale.id
      },
      { transaction }
    );

    // ==================================================
    // Commit transaction
    // ==================================================

    await transaction.commit();

    transactionCommitted = true;

    // ==================================================
    // Create audit log
    // ==================================================

    try {
      const {
        ipAddress = null,
        userAgent = null
      } = requestMetadata;

      await createAuditLog({
        userId,
        action: "sale",
        module: "sales",
        description:
          `Sale ${sale.saleNumber} completed for GH₵${totalAmount.toFixed(2)}.`,
        entityType: "Sale",
        entityId: sale.id,
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      console.error(
        "Sale audit log failed:",
        auditError.message
      );
    }

    // Return the completed sale with its related records.
    return Sale.findByPk(sale.id, {
      include: saleIncludes
    });
  } catch (error) {
    // If anything failed before commit, undo all
    // database changes, including stock deductions.
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
  const sale = await Sale.findByPk(id, {
    include: saleIncludes
  });

  if (!sale) {
    throw createHttpError(
      "Sale not found.",
      404
    );
  }

  return sale;
};

// ======================================================
// Cancel Sale
// ======================================================

const cancelSale = async (
  id,
  userId,
  requestMetadata = {}
) => {
  const transaction = await sequelize.transaction();

  let transactionCommitted = false;

  try {
    // Lock the sale to avoid simultaneous cancellations.
    const sale = await Sale.findByPk(id, {
      include: [
        { model: SaleItem, as: "items" }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!sale) {
      throw createHttpError(
        "Sale not found.",
        404
      );
    }

    if (sale.status !== "completed") {
      throw createHttpError(
        `This sale cannot be cancelled because its current status is ${sale.status}.`,
        400
      );
    }

    const affectedPrescriptionIds = new Set();

    // --------------------------------------------------
    // Restore inventory and prescription quantities
    // --------------------------------------------------

    for (const item of sale.items) {
      const batch = await Batch.findByPk(
        item.batchId,
        {
          transaction,
          lock: transaction.LOCK.UPDATE
        }
      );

      if (!batch) {
        throw createHttpError(
          `Batch with ID ${item.batchId} no longer exists.`,
          400
        );
      }

      // Return the sold quantity to its original batch.
      batch.quantity =
        Number(batch.quantity) +
        Number(item.quantity);

      await batch.save({ transaction });

      // Reverse prescription dispensing if applicable.
      if (item.prescriptionItemId) {
        const prescriptionItem =
          await PrescriptionItem.findByPk(
            item.prescriptionItemId,
            {
              transaction,
              lock: transaction.LOCK.UPDATE
            }
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

    // Recalculate affected prescription statuses.
    for (const prescriptionId of affectedPrescriptionIds) {
      await updatePrescriptionStatus(
        prescriptionId,
        transaction
      );
    }

    // --------------------------------------------------
    // Mark sale as cancelled
    // --------------------------------------------------

    sale.status = "cancelled";

    await sale.save({ transaction });

    // Mark completed payments as refunded.
    await Payment.update(
      { status: "refunded" },
      {
        where: {
          saleId: sale.id,
          status: "completed"
        },
        transaction
      }
    );

    // --------------------------------------------------
    // Commit cancellation
    // --------------------------------------------------

    await transaction.commit();

    transactionCommitted = true;

    // --------------------------------------------------
    // Create cancellation audit log
    // --------------------------------------------------

    try {
      const {
        ipAddress = null,
        userAgent = null
      } = requestMetadata;

      await createAuditLog({
        userId,
        action: "delete",
        module: "sales",
        description:
          `Sale ${sale.saleNumber} was cancelled and inventory restored.`,
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

// ======================================================
// Exports
// ======================================================

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  cancelSale
};
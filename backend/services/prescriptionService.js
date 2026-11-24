
const { Op } = require("sequelize");
const crypto = require("crypto");

const sequelize = require("../config/database");

const {
  Prescription,
  PrescriptionItem,
  Customer,
  User,
  Medicine,
} = require("../models");

// ======================================================
// Helpers
// ======================================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const prescriptionIncludes = [
  {
    model: Customer,
    as: "customer",
  },
  {
    model: User,
    as: "creator",
    attributes: { exclude: ["password"] },
  },
  {
    model: PrescriptionItem,
    as: "items",
    include: [
      {
        model: Medicine,
        as: "medicine",
      },
    ],
  },
];

const handlePrescriptionError = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    throw createError(
      "That prescription number already exists. Please retry.",
      409
    );
  }

  throw error;
};

const isValidStatus = (status) =>
  [
    "active",
    "partially_dispensed",
    "dispensed",
    "cancelled",
  ].includes(status);

// ======================================================
// Generate a unique prescription number
//
// Example: RX-20261020-A3F91C
// ======================================================

const generatePrescriptionNumber = async (transaction) => {
  const now = new Date();

  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const randomPart = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    const prescriptionNumber = `RX-${datePart}-${randomPart}`;

    const existing = await Prescription.findOne({
      where: { prescriptionNumber },
      transaction,
    });

    if (!existing) {
      return prescriptionNumber;
    }
  }

  throw createError(
    "Unable to generate a unique prescription number. Please try again.",
    500
  );
};

// ======================================================
// Create prescription
// ======================================================

const createPrescription = async (data, userId) => {
  const {
    prescriptionDate,
    doctorName,
    doctorLicenseNumber,
    diagnosis,
    notes,
    customerId,
    items,
  } = data;

  if (!prescriptionDate) {
    throw createError(
      "Prescription date is required.",
      400
    );
  }

  if (!String(doctorName || "").trim()) {
    throw createError(
      "Prescriber name is required.",
      400
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createError(
      "A prescription must contain at least one medicine.",
      400
    );
  }

  // Validate medicine IDs before starting the transaction.
  const medicineIds = items.map((item) =>
    Number(item.medicineId)
  );

  if (
    medicineIds.some(
      (id) => !Number.isInteger(id) || id <= 0
    )
  ) {
    throw createError(
      "Every prescription item must have a valid medicine.",
      400
    );
  }

  if (new Set(medicineIds).size !== medicineIds.length) {
    throw createError(
      "A medicine cannot appear more than once in the same prescription.",
      400
    );
  }

  // Validate prescription items.
  for (const item of items) {
    if (
      !String(item.dosage || "").trim() ||
      !String(item.frequency || "").trim() ||
      !String(item.duration || "").trim()
    ) {
      throw createError(
        "Dosage, frequency, and duration are required for every medicine.",
        400
      );
    }

    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw createError(
        "Medicine quantity must be a positive whole number.",
        400
      );
    }
  }

  const transaction = await sequelize.transaction();

  try {
    // ----------------------------------------------------
    // 1. Validate the customer
    // ----------------------------------------------------

    const customer = await Customer.findByPk(customerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customer) {
      throw createError("Customer not found.", 404);
    }

    // ----------------------------------------------------
    // 2. Validate the user creating the prescription
    // ----------------------------------------------------

    const creator = await User.findByPk(userId, {
      transaction,
    });

    if (!creator) {
      throw createError(
        "The user creating this prescription was not found.",
        404
      );
    }

    // ----------------------------------------------------
    // 3. Validate the selected medicines
    // ----------------------------------------------------

    const medicines = await Medicine.findAll({
      where: {
        id: { [Op.in]: medicineIds },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (medicines.length !== medicineIds.length) {
      throw createError(
        "One or more selected medicines do not exist.",
        404
      );
    }

    // ----------------------------------------------------
    // 4. Generate a unique prescription number
    // ----------------------------------------------------

    const prescriptionNumber =
      await generatePrescriptionNumber(transaction);

    // ----------------------------------------------------
    // 5. Create the prescription
    //
    // Prescriber details are entered manually.
    // doctorId is set to null for new prescriptions.
    // The existing column is retained for historical data.
    // ----------------------------------------------------

    const prescription = await Prescription.create(
      {
        prescriptionNumber,
        prescriptionDate,

        doctorId: null,
        doctorName: String(doctorName).trim(),

        doctorLicenseNumber: doctorLicenseNumber
          ? String(doctorLicenseNumber).trim() || null
          : null,

        diagnosis: diagnosis
          ? String(diagnosis).trim()
          : null,

        notes: notes
          ? String(notes).trim()
          : null,

        customerId: customer.id,
        createdBy: creator.id,
        status: "active",
      },
      { transaction }
    );

    // ----------------------------------------------------
    // 6. Create prescription items
    // ----------------------------------------------------

    const prescriptionItems = items.map((item) => ({
      prescriptionId: prescription.id,
      medicineId: Number(item.medicineId),

      dosage: String(item.dosage).trim(),
      frequency: String(item.frequency).trim(),
      duration: String(item.duration).trim(),

      quantity: Number(item.quantity),
      dispensedQuantity: 0,

      instructions: item.instructions
        ? String(item.instructions).trim()
        : null,
    }));

    await PrescriptionItem.bulkCreate(
      prescriptionItems,
      { transaction }
    );

    // ----------------------------------------------------
    // 7. Commit the transaction
    // ----------------------------------------------------

    await transaction.commit();

    // Return the complete prescription.
    return getPrescriptionById(prescription.id);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    handlePrescriptionError(error);
  }
};

// ======================================================
// Get all prescriptions
// ======================================================

const getAllPrescriptions = async (filters = {}) => {
  const {
    search,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = filters;

  const currentPage = Math.max(
    1,
    Number(page) || 1
  );

  const pageSize = Math.min(
    100,
    Math.max(1, Number(limit) || 10)
  );

  const offset = (currentPage - 1) * pageSize;

  const where = {};

  if (status && status !== "all" && isValidStatus(status)) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.prescriptionDate = {};

    if (startDate) {
      where.prescriptionDate[Op.gte] = startDate;
    }

    if (endDate) {
      where.prescriptionDate[Op.lte] = endDate;
    }
  }

  if (search && String(search).trim()) {
    const searchTerm = `%${String(search).trim()}%`;

    where[Op.or] = [
      {
        prescriptionNumber: {
          [Op.like]: searchTerm,
        },
      },
      {
        doctorName: {
          [Op.like]: searchTerm,
        },
      },
      {
        doctorLicenseNumber: {
          [Op.like]: searchTerm,
        },
      },
      {
        diagnosis: {
          [Op.like]: searchTerm,
        },
      },
    ];
  }

  const { count, rows } =
    await Prescription.findAndCountAll({
      where,
      include: prescriptionIncludes,
      distinct: true,
      limit: pageSize,
      offset,
      order: [
        ["prescriptionDate", "DESC"],
        ["id", "DESC"],
      ],
    });

  return {
    prescriptions: rows,
    pagination: {
      total: count,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
  };
};

// ======================================================
// Get prescription summary
// ======================================================

const getPrescriptionSummary = async () => {
  const now = new Date();

  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  const startOfTomorrow = new Date(
    startOfToday.getTime() + 24 * 60 * 60 * 1000
  );

  const startOfMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );

  const startOfNextMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1
    )
  );

  const [
    total,
    active,
    partiallyDispensed,
    dispensed,
    cancelled,
    createdToday,
    createdThisMonth,
  ] = await Promise.all([
    Prescription.count(),

    Prescription.count({
      where: { status: "active" },
    }),

    Prescription.count({
      where: { status: "partially_dispensed" },
    }),

    Prescription.count({
      where: { status: "dispensed" },
    }),

    Prescription.count({
      where: { status: "cancelled" },
    }),

    Prescription.count({
      where: {
        createdAt: {
          [Op.gte]: startOfToday,
          [Op.lt]: startOfTomorrow,
        },
      },
    }),

    Prescription.count({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
          [Op.lt]: startOfNextMonth,
        },
      },
    }),
  ]);

  return {
    total,
    active,
    partiallyDispensed,
    dispensed,
    cancelled,
    createdToday,
    createdThisMonth,
  };
};

// ======================================================
// Get prescription by ID
// ======================================================

const getPrescriptionById = async (id) => {
  const prescription = await Prescription.findByPk(id, {
    include: prescriptionIncludes,
  });

  if (!prescription) {
    throw createError(
      "Prescription not found.",
      404
    );
  }

  return prescription;
};

// ======================================================
// Get prescription items
// ======================================================

const getPrescriptionItems = async (prescriptionId) => {
  const prescription = await Prescription.findByPk(
    prescriptionId
  );

  if (!prescription) {
    throw createError(
      "Prescription not found.",
      404
    );
  }

  return PrescriptionItem.findAll({
    where: { prescriptionId },
    include: [
      {
        model: Medicine,
        as: "medicine",
      },
    ],
    order: [["id", "ASC"]],
  });
};

// ======================================================
// Cancel prescription
// ======================================================

const cancelPrescription = async (id) => {
  const transaction = await sequelize.transaction();

  try {
    const prescription = await Prescription.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!prescription) {
      throw createError(
        "Prescription not found.",
        404
      );
    }

    if (prescription.status === "cancelled") {
      throw createError(
        "This prescription has already been cancelled.",
        400
      );
    }

    if (
      prescription.status === "partially_dispensed" ||
      prescription.status === "dispensed"
    ) {
      throw createError(
        "A partially or fully dispensed prescription cannot be cancelled.",
        400
      );
    }

    if (prescription.status !== "active") {
      throw createError(
        "Only active prescriptions can be cancelled.",
        400
      );
    }

    prescription.status = "cancelled";

    await prescription.save({ transaction });
    await transaction.commit();

    return getPrescriptionById(id);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

// ======================================================
// Exports
// ======================================================

module.exports = {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionSummary,
  getPrescriptionById,
  getPrescriptionItems,
  cancelPrescription,
};
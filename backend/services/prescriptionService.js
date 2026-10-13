
const { Op } = require("sequelize");

const sequelize = require("../config/database");
const {
  Prescription,
  PrescriptionItem,
  Customer,
  User,
  Medicine
} = require("../models");

// ==========================================
// Helpers
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const prescriptionIncludes = [
  { model: Customer, as: "customer" },
  {
    model: User,
    as: "creator",
    attributes: { exclude: ["password"] }
  },
  {
    model: PrescriptionItem,
    as: "items",
    include: [{ model: Medicine, as: "medicine" }]
  }
];

const handlePrescriptionError = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    throw createError(
      "A prescription with these unique details already exists.",
      409
    );
  }

  throw error;
};

const isValidStatus = (status) =>
  ["active", "partially_dispensed", "dispensed", "cancelled"].includes(
    status
  );

// ==========================================
// Create Prescription
// ==========================================

const createPrescription = async (data, userId) => {
  const {
    prescriptionNumber,
    prescriptionDate,
    doctorName,
    doctorLicenseNumber,
    diagnosis,
    notes,
    customerId,
    items
  } = data;

  if (!Array.isArray(items) || items.length === 0) {
    throw createError(
      "A prescription must contain at least one medicine.",
      400
    );
  }

  const medicineIds = items.map((item) => Number(item.medicineId));

  if (new Set(medicineIds).size !== medicineIds.length) {
    throw createError(
      "A medicine cannot appear more than once in the same prescription.",
      400
    );
  }

  const transaction = await sequelize.transaction();

  try {
    const customer = await Customer.findByPk(customerId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!customer) throw createError("Customer not found.", 404);

    const existingPrescription = await Prescription.findOne({
      where: { prescriptionNumber },
      transaction
    });

    if (existingPrescription) {
      throw createError("Prescription number already exists.", 409);
    }

    const creator = await User.findByPk(userId, { transaction });

    if (!creator) {
      throw createError(
        "The user creating this prescription was not found.",
        404
      );
    }

    const medicines = await Medicine.findAll({
      where: { id: { [Op.in]: medicineIds } },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (medicines.length !== medicineIds.length) {
      throw createError(
        "One or more selected medicines do not exist.",
        404
      );
    }

    const prescription = await Prescription.create(
      {
        prescriptionNumber,
        prescriptionDate,
        doctorName,
        doctorLicenseNumber,
        diagnosis,
        notes,
        customerId,
        createdBy: userId,
        status: "active"
      },
      { transaction }
    );

    const prescriptionItems = items.map((item) => ({
      prescriptionId: prescription.id,
      medicineId: item.medicineId,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      quantity: item.quantity,
      dispensedQuantity: 0,
      instructions: item.instructions
    }));

    await PrescriptionItem.bulkCreate(prescriptionItems, { transaction });

    await transaction.commit();

    return getPrescriptionById(prescription.id);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    handlePrescriptionError(error);
  }
};

// ==========================================
// Get All Prescriptions
// ==========================================

const getAllPrescriptions = async (filters = {}) => {
  const {
    search,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = filters;

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (currentPage - 1) * pageSize;

  const where = {};

  if (status && status !== "all" && isValidStatus(status)) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.prescriptionDate = {};

    if (startDate) where.prescriptionDate[Op.gte] = startDate;
    if (endDate) where.prescriptionDate[Op.lte] = endDate;
  }

  if (search && String(search).trim()) {
    const searchTerm = `%${String(search).trim()}%`;

    where[Op.or] = [
      { prescriptionNumber: { [Op.like]: searchTerm } },
      { doctorName: { [Op.like]: searchTerm } },
      { diagnosis: { [Op.like]: searchTerm } }
    ];
  }

  const { count, rows } = await Prescription.findAndCountAll({
    where,
    include: prescriptionIncludes,
    distinct: true,
    limit: pageSize,
    offset,
    order: [
      ["prescriptionDate", "DESC"],
      ["id", "DESC"]
    ]
  });

  return {
    prescriptions: rows,
    pagination: {
      total: count,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(count / pageSize)
    }
  };
};

// ==========================================
// Get Prescription Summary
// ==========================================

const getPrescriptionSummary = async () => {
  const now = new Date();

  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const startOfTomorrow = new Date(
    startOfToday.getTime() + 24 * 60 * 60 * 1000
  );

  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const startOfNextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const [
    total,
    active,
    partiallyDispensed,
    dispensed,
    cancelled,
    createdToday,
    createdThisMonth
  ] = await Promise.all([
    Prescription.count(),
    Prescription.count({ where: { status: "active" } }),
    Prescription.count({ where: { status: "partially_dispensed" } }),
    Prescription.count({ where: { status: "dispensed" } }),
    Prescription.count({ where: { status: "cancelled" } }),
    Prescription.count({
      where: {
        createdAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow }
      }
    }),
    Prescription.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth, [Op.lt]: startOfNextMonth }
      }
    })
  ]);

  return {
    total,
    active,
    partiallyDispensed,
    dispensed,
    cancelled,
    createdToday,
    createdThisMonth
  };
};

// ==========================================
// Get Prescription By ID
// ==========================================

const getPrescriptionById = async (id) => {
  const prescription = await Prescription.findByPk(id, {
    include: prescriptionIncludes
  });

  if (!prescription) {
    throw createError("Prescription not found.", 404);
  }

  return prescription;
};

// ==========================================
// Get Prescription Items
// ==========================================

const getPrescriptionItems = async (prescriptionId) => {
  const prescription = await Prescription.findByPk(prescriptionId);

  if (!prescription) {
    throw createError("Prescription not found.", 404);
  }

  return PrescriptionItem.findAll({
    where: { prescriptionId },
    include: [{ model: Medicine, as: "medicine" }],
    order: [["id", "ASC"]]
  });
};

// ==========================================
// Cancel Prescription
// ==========================================

const cancelPrescription = async (id) => {
  const transaction = await sequelize.transaction();

  try {
    const prescription = await Prescription.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!prescription) throw createError("Prescription not found.", 404);

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
      throw createError("Only active prescriptions can be cancelled.", 400);
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

module.exports = {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionSummary,
  getPrescriptionById,
  getPrescriptionItems,
  cancelPrescription
};
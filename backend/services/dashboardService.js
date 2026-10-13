
const { Op } = require("sequelize");

const {
  Sale,
  Medicine,
  Batch,
  Prescription,
  Customer
} = require("../models");

// ======================================================
// Helpers
// ======================================================

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const todayString = () => new Date().toISOString().split("T")[0];

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

// Compute the sum of quantities across batches for a medicine.
const totalStockForMedicine = (medicine) =>
  (medicine.batches || []).reduce(
    (sum, batch) => sum + Number(batch.quantity),
    0
  );

// ======================================================
// Get Dashboard Overview
// ======================================================

const getDashboardOverview = async () => {
  const now = new Date();

  // ----------------------------------------------
  // Sales — today + this month
  // ----------------------------------------------

  const [todaySales, monthlySales] = await Promise.all([
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfDay(now), endOfDay(now)] },
        status: "completed"
      },
      attributes: ["id", "totalAmount"]
    }),
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfMonth(now), endOfMonth(now)] },
        status: "completed"
      },
      attributes: ["id", "totalAmount"]
    })
  ]);

  const todayRevenue = todaySales.reduce(
    (total, sale) => total + Number(sale.totalAmount),
    0
  );

  const monthlyRevenue = monthlySales.reduce(
    (total, sale) => total + Number(sale.totalAmount),
    0
  );

  // ----------------------------------------------
  // Inventory — totals + stock health
  // ----------------------------------------------

  const [totalMedicines, batches, medicines] = await Promise.all([
    Medicine.count({ where: { isActive: true } }),

    Batch.findAll({ attributes: ["quantity", "expiryDate"] }),

    Medicine.findAll({
      where: { isActive: true },
      attributes: ["id", "reorderLevel"],
      include: [
        { model: Batch, as: "batches", attributes: ["quantity"] }
      ]
    })
  ]);

  const totalUnits = batches.reduce(
    (total, batch) => total + Number(batch.quantity),
    0
  );

  let lowStockCount = 0;
  let outOfStockCount = 0;

  medicines.forEach((medicine) => {
    const stock = totalStockForMedicine(medicine);

    if (stock === 0) {
      outOfStockCount += 1;
    } else if (stock <= medicine.reorderLevel) {
      lowStockCount += 1;
    }
  });

  // ----------------------------------------------
  // Expiry — expiring soon + expired
  // ----------------------------------------------

  const today = todayString();
  const warningDate = daysFromNow(90);

  const [expiringBatchCount, expiredBatchCount] = await Promise.all([
    Batch.count({
      where: {
        quantity: { [Op.gt]: 0 },
        expiryDate: { [Op.between]: [today, warningDate] }
      }
    }),
    Batch.count({
      where: {
        expiryDate: { [Op.lt]: today },
        quantity: { [Op.gt]: 0 }
      }
    })
  ]);

  // ----------------------------------------------
  // Prescriptions — counts by status
  // ----------------------------------------------

  const [
    totalPrescriptions,
    activePrescriptions,
    partiallyDispensedPrescriptions,
    dispensedPrescriptions
  ] = await Promise.all([
    Prescription.count(),
    Prescription.count({ where: { status: "active" } }),
    Prescription.count({ where: { status: "partially_dispensed" } }),
    Prescription.count({ where: { status: "dispensed" } })
  ]);

  // ----------------------------------------------
  // Recent sales
  // ----------------------------------------------

  const recentSales = await Sale.findAll({
    where: { status: "completed" },
    attributes: ["id", "saleNumber", "saleDate", "totalAmount"],
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "firstName", "lastName"]
      }
    ],
    order: [["saleDate", "DESC"]],
    limit: 10
  });

  const formattedRecentSales = recentSales.map((sale) => ({
    id: sale.id,
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate,
    totalAmount: Number(sale.totalAmount),
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: `${sale.customer.firstName} ${sale.customer.lastName}`
        }
      : null
  }));

  // ----------------------------------------------
  // Return
  // ----------------------------------------------

  return {
    sales: {
      todayCount: todaySales.length,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      monthlyCount: monthlySales.length,
      monthlyRevenue: Number(monthlyRevenue.toFixed(2))
    },
    inventory: {
      totalMedicines,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      expiringBatchCount,
      expiredBatchCount
    },
    prescriptions: {
      total: totalPrescriptions,
      active: activePrescriptions,
      partiallyDispensed: partiallyDispensedPrescriptions,
      dispensed: dispensedPrescriptions
    },
    recentSales: formattedRecentSales
  };
};

module.exports = {
  getDashboardOverview
};
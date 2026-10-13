
const { Op } = require("sequelize");

const { Sale, SaleItem, Medicine, Batch } = require("../models");

// ==========================================
// Helpers
// ==========================================

const roundMoney = (value) => Number(Number(value).toFixed(2));

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

const saleIncludes = [
  {
    model: SaleItem,
    as: "items",
    include: [
      {
        model: Medicine,
        as: "medicine",
        attributes: ["id", "name", "sku"]
      },
      {
        model: Batch,
        as: "batch",
        attributes: ["id", "purchasePrice"]
      }
    ]
  }
];

const aggregateMedicines = (sales) => {
  const map = {};

  sales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const medicine = item.medicine;
      if (!medicine) return;

      const id = medicine.id;

      if (!map[id]) {
        map[id] = {
          medicineId: id,
          name: medicine.name,
          sku: medicine.sku,
          unitsSold: 0,
          revenue: 0,
          cost: 0
        };
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const purchasePrice = Number(item.batch?.purchasePrice || 0);

      map[id].unitsSold += quantity;
      map[id].revenue += quantity * unitPrice;
      map[id].cost += quantity * purchasePrice;
    });
  });

  return Object.values(map)
    .map((medicine) => {
      const profit = medicine.revenue - medicine.cost;
      const profitMargin =
        medicine.revenue > 0 ? (profit / medicine.revenue) * 100 : 0;

      return {
        medicineId: medicine.medicineId,
        name: medicine.name,
        sku: medicine.sku,
        unitsSold: medicine.unitsSold,
        revenue: roundMoney(medicine.revenue),
        cost: roundMoney(medicine.cost),
        profit: roundMoney(profit),
        profitMargin: roundMoney(profitMargin)
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);
};

// ==========================================
// Get Top Selling Medicines
// ==========================================

const getTopSellingMedicines = async () => {
  const now = new Date();

  const [todaySales, monthlySales] = await Promise.all([
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfDay(now), endOfDay(now)] },
        status: "completed"
      },
      include: saleIncludes
    }),
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfMonth(now), endOfMonth(now)] },
        status: "completed"
      },
      include: saleIncludes
    })
  ]);

  return {
    today: aggregateMedicines(todaySales),
    month: aggregateMedicines(monthlySales)
  };
};

module.exports = {
  getTopSellingMedicines
};
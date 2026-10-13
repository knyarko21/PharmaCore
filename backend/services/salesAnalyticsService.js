
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

const periodIncludes = [
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
        attributes: ["id", "batchNumber", "purchasePrice"]
      }
    ]
  }
];

const aggregatePeriod = (sales) => {
  let revenue = 0;
  let cost = 0;
  let unitsSold = 0;

  sales.forEach((sale) => {
    revenue += Number(sale.totalAmount);

    (sale.items || []).forEach((item) => {
      const quantity = Number(item.quantity);
      const purchasePrice = Number(item.batch?.purchasePrice || 0);

      unitsSold += quantity;
      cost += quantity * purchasePrice;
    });
  });

  const profit = revenue - cost;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue: roundMoney(revenue),
    cost: roundMoney(cost),
    profit: roundMoney(profit),
    profitMargin: roundMoney(profitMargin),
    unitsSold,
    salesCount: sales.length
  };
};

// ==========================================
// Get Sales Analytics
// ==========================================

const getSalesAnalytics = async () => {
  const now = new Date();

  const [todaySales, monthlySales] = await Promise.all([
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfDay(now), endOfDay(now)] },
        status: "completed"
      },
      include: periodIncludes
    }),
    Sale.findAll({
      where: {
        saleDate: { [Op.between]: [startOfMonth(now), endOfMonth(now)] },
        status: "completed"
      },
      include: periodIncludes
    })
  ]);

  return {
    today: aggregatePeriod(todaySales),
    month: aggregatePeriod(monthlySales)
  };
};

module.exports = {
  getSalesAnalytics
};
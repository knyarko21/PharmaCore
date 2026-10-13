
const { Op } = require("sequelize");

const { Sale, SaleItem, Batch } = require("../models");

// ==========================================
// Helpers
// ==========================================

const roundMoney = (value) => Number(Number(value).toFixed(2));

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const dateKey = (date) => new Date(date).toISOString().split("T")[0];

const buildEmptyDay = (date) => ({
  date,
  revenue: 0,
  cost: 0,
  profit: 0,
  unitsSold: 0,
  salesCount: 0
});

const trendIncludes = [
  {
    model: SaleItem,
    as: "items",
    include: [
      {
        model: Batch,
        as: "batch",
        attributes: ["purchasePrice"]
      }
    ]
  }
];

// ==========================================
// Get Sales Trends
// ==========================================

const getSalesTrends = async () => {
  const now = new Date();

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 29);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const sales = await Sale.findAll({
    where: {
      saleDate: { [Op.between]: [startDate, endDate] },
      status: "completed"
    },
    include: trendIncludes,
    order: [["saleDate", "ASC"]]
  });

  // Pre-populate all 30 days with zeros.
  const dailyMap = {};

  for (let i = 0; i < 30; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = dateKey(date);
    dailyMap[key] = buildEmptyDay(key);
  }

  // Aggregate sales into the correct day.
  sales.forEach((sale) => {
    const key = dateKey(sale.saleDate);
    if (!dailyMap[key]) return;

    dailyMap[key].revenue += Number(sale.totalAmount);
    dailyMap[key].salesCount += 1;

    (sale.items || []).forEach((item) => {
      const quantity = Number(item.quantity);
      const purchasePrice = Number(item.batch?.purchasePrice || 0);

      dailyMap[key].unitsSold += quantity;
      dailyMap[key].cost += quantity * purchasePrice;
    });
  });

  const trends = Object.values(dailyMap).map((day) => {
    const profit = day.revenue - day.cost;
    const profitMargin =
      day.revenue > 0 ? (profit / day.revenue) * 100 : 0;

    return {
      date: day.date,
      revenue: roundMoney(day.revenue),
      cost: roundMoney(day.cost),
      profit: roundMoney(profit),
      profitMargin: roundMoney(profitMargin),
      unitsSold: day.unitsSold,
      salesCount: day.salesCount
    };
  });

  // Roll up totals.
  const totals = trends.reduce(
    (acc, day) => {
      acc.revenue += day.revenue;
      acc.cost += day.cost;
      acc.unitsSold += day.unitsSold;
      acc.salesCount += day.salesCount;
      return acc;
    },
    { revenue: 0, cost: 0, unitsSold: 0, salesCount: 0 }
  );

  const totalProfit = totals.revenue - totals.cost;
  const totalProfitMargin =
    totals.revenue > 0 ? (totalProfit / totals.revenue) * 100 : 0;

  return {
    period: {
      startDate: dateKey(startDate),
      endDate: dateKey(endDate)
    },
    summary: {
      revenue: roundMoney(totals.revenue),
      cost: roundMoney(totals.cost),
      profit: roundMoney(totalProfit),
      profitMargin: roundMoney(totalProfitMargin),
      unitsSold: totals.unitsSold,
      salesCount: totals.salesCount
    },
    trends
  };
};

module.exports = {
  getSalesTrends
};
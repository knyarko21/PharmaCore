
const { Medicine, Batch } = require("../models");

// ======================================================
// Helpers
// ======================================================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const todayString = () => new Date().toISOString().split("T")[0];

const futureDateString = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const daysUntil = (from, to) =>
  Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);

// ======================================================
// Get Inventory Alerts
// ======================================================

const getInventoryAlerts = async () => {
  const today = todayString();
  const warningDate = futureDateString(90);

  const medicines = await Medicine.findAll({
    where: { isActive: true },
    attributes: ["id", "name", "sku", "reorderLevel"],
    include: [
      {
        model: Batch,
        as: "batches",
        attributes: ["id", "batchNumber", "quantity", "expiryDate"]
      }
    ]
  });

  const lowStock = [];
  const outOfStock = [];
  const expiringSoon = [];
  const expired = [];

  medicines.forEach((medicine) => {
    const batches = medicine.batches || [];

    const totalStock = batches.reduce(
      (sum, batch) => sum + Number(batch.quantity),
      0
    );

    // ----------------------------------------------
    // Stock alerts
    // ----------------------------------------------

    if (totalStock === 0) {
      outOfStock.push({
        medicineId: medicine.id,
        name: medicine.name,
        sku: medicine.sku,
        currentStock: 0,
        reorderLevel: medicine.reorderLevel
      });
    } else if (totalStock <= medicine.reorderLevel) {
      lowStock.push({
        medicineId: medicine.id,
        name: medicine.name,
        sku: medicine.sku,
        currentStock: totalStock,
        reorderLevel: medicine.reorderLevel
      });
    }

    // ----------------------------------------------
    // Batch expiry alerts
    // ----------------------------------------------

    batches.forEach((batch) => {
      const quantity = Number(batch.quantity);
      if (quantity <= 0) return;

      const expiryDate = batch.expiryDate;

      if (expiryDate < today) {
        expired.push({
          medicineId: medicine.id,
          medicineName: medicine.name,
          sku: medicine.sku,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity,
          expiryDate
        });
        return;
      }

      if (expiryDate >= today && expiryDate <= warningDate) {
        expiringSoon.push({
          medicineId: medicine.id,
          medicineName: medicine.name,
          sku: medicine.sku,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity,
          expiryDate,
          daysUntilExpiry: daysUntil(today, expiryDate)
        });
      }
    });
  });

  expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  expired.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const totalAlerts =
    lowStock.length + outOfStock.length + expiringSoon.length + expired.length;

  return {
    summary: {
      totalAlerts,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      expiringSoonCount: expiringSoon.length,
      expiredCount: expired.length
    },
    alerts: { lowStock, outOfStock, expiringSoon, expired }
  };
};

module.exports = {
  getInventoryAlerts
};

// ======================================================
// PharmaCore — Model Registry & Associations
// ======================================================
//
// Loads every model, wires up every association, and
// re-exports them all. Anything imported from this file
// gets both the model and its relationships ready to use.
//
// Import pattern:
//   const { Sale, SaleItem, Medicine } = require("../models");
//
// Association naming convention:
//   - Parent side uses the plural form    (User.hasMany(Sale, { as: "sales" }))
//   - Child side uses the singular form   (Sale.belongsTo(User, { as: "creator" }))
//
// This keeps include queries explicit:
//   Sale.findAll({ include: [{ model: User, as: "creator" }] })
// ======================================================

const User = require("./User");
const Category = require("./Category");
const Medicine = require("./Medicine");
const Supplier = require("./Supplier");
const Batch = require("./Batch");
const Purchase = require("./Purchase");
const PurchaseItem = require("./PurchaseItem");
const Customer = require("./Customer");
const Prescription = require("./Prescription");
const PrescriptionItem = require("./PrescriptionItem");
const Sale = require("./Sale");
const SaleItem = require("./SaleItem");
const Payment = require("./Payment");
const AuditLog = require("./AuditLog");
const Setting = require("./Setting");

// ======================================================
// User ↔ Setting (1:1)
// ======================================================

User.hasOne(Setting, {
  foreignKey: "userId",
  as: "settings",
  onDelete: "CASCADE"
});

Setting.belongsTo(User, {
  foreignKey: "userId",
  as: "user"
});

// ======================================================
// Category ↔ Medicine (1:N)
// ======================================================

Category.hasMany(Medicine, {
  foreignKey: "categoryId",
  as: "medicines"
});

Medicine.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category"
});

// ======================================================
// Medicine ↔ Batch (1:N)
// ======================================================

Medicine.hasMany(Batch, {
  foreignKey: "medicineId",
  as: "batches"
});

Batch.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine"
});

// ======================================================
// Supplier ↔ Batch (1:N)
// ======================================================

Supplier.hasMany(Batch, {
  foreignKey: "supplierId",
  as: "batches"
});

Batch.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier"
});

// ======================================================
// Supplier ↔ Purchase (1:N)
// ======================================================

Supplier.hasMany(Purchase, {
  foreignKey: "supplierId",
  as: "purchases"
});

Purchase.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier"
});

// ======================================================
// User ↔ Purchase (1:N, via createdBy)
// ======================================================

User.hasMany(Purchase, {
  foreignKey: "createdBy",
  as: "purchases"
});

Purchase.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator"
});

// ======================================================
// Purchase ↔ PurchaseItem (1:N)
// ======================================================

Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items"
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase"
});

// ======================================================
// Medicine ↔ PurchaseItem (1:N)
// ======================================================

Medicine.hasMany(PurchaseItem, {
  foreignKey: "medicineId",
  as: "purchaseItems"
});

PurchaseItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine"
});

// ======================================================
// Customer ↔ Prescription (1:N)
// ======================================================

Customer.hasMany(Prescription, {
  foreignKey: "customerId",
  as: "prescriptions"
});

Prescription.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer"
});

// ======================================================
// User ↔ Prescription (1:N, via createdBy)
// ======================================================

User.hasMany(Prescription, {
  foreignKey: "createdBy",
  as: "prescriptions"
});

Prescription.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator"
});

// ======================================================
// Prescription ↔ PrescriptionItem (1:N)
// ======================================================

Prescription.hasMany(PrescriptionItem, {
  foreignKey: "prescriptionId",
  as: "items"
});

PrescriptionItem.belongsTo(Prescription, {
  foreignKey: "prescriptionId",
  as: "prescription"
});

// ======================================================
// Medicine ↔ PrescriptionItem (1:N)
// ======================================================

Medicine.hasMany(PrescriptionItem, {
  foreignKey: "medicineId",
  as: "prescriptionItems"
});

PrescriptionItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine"
});

// ======================================================
// Customer ↔ Sale (1:N)
// ======================================================

Customer.hasMany(Sale, {
  foreignKey: "customerId",
  as: "sales"
});

Sale.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer"
});

// ======================================================
// User ↔ Sale (1:N, via createdBy)
// ======================================================

User.hasMany(Sale, {
  foreignKey: "createdBy",
  as: "sales"
});

Sale.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator"
});

// ======================================================
// Sale ↔ SaleItem (1:N)
// ======================================================

Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items"
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale"
});

// ======================================================
// Medicine ↔ SaleItem (1:N)
// ======================================================

Medicine.hasMany(SaleItem, {
  foreignKey: "medicineId",
  as: "saleItems"
});

SaleItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine"
});

// ======================================================
// PrescriptionItem ↔ SaleItem (1:N)
// ======================================================

PrescriptionItem.hasMany(SaleItem, {
  foreignKey: "prescriptionItemId",
  as: "saleItems"
});

SaleItem.belongsTo(PrescriptionItem, {
  foreignKey: "prescriptionItemId",
  as: "prescriptionItem"
});

// ======================================================
// Batch ↔ SaleItem (1:N)
// ======================================================

Batch.hasMany(SaleItem, {
  foreignKey: "batchId",
  as: "saleItems"
});

SaleItem.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch"
});

// ======================================================
// Sale ↔ Payment (1:N)
// ======================================================

Sale.hasMany(Payment, {
  foreignKey: "saleId",
  as: "payments"
});

Payment.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale"
});

// ======================================================
// User ↔ AuditLog (1:N)
// ======================================================

User.hasMany(AuditLog, {
  foreignKey: "userId",
  as: "auditLogs"
});

AuditLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user"
});

// ======================================================
// Exports
// ======================================================

module.exports = {
  User,
  Category,
  Medicine,
  Supplier,
  Batch,
  Purchase,
  PurchaseItem,
  Customer,
  Prescription,
  PrescriptionItem,
  Sale,
  SaleItem,
  Payment,
  AuditLog,
  Setting
};
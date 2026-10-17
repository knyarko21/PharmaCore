
const sequelize = require("../config/database");

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

// ==========================================
// USER AND SETTINGS ASSOCIATIONS
// ==========================================

User.hasOne(Setting, {
  foreignKey: "userId",
  as: "settings",
  onDelete: "CASCADE",
});

Setting.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ==========================================
// CATEGORY AND MEDICINE ASSOCIATIONS
// ==========================================

Category.hasMany(Medicine, {
  foreignKey: "categoryId",
  as: "medicines",
});

Medicine.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// ==========================================
// MEDICINE AND BATCH ASSOCIATIONS
// ==========================================

Medicine.hasMany(Batch, {
  foreignKey: "medicineId",
  as: "batches",
});

Batch.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// ==========================================
// SUPPLIER AND BATCH ASSOCIATIONS
// ==========================================

Supplier.hasMany(Batch, {
  foreignKey: "supplierId",
  as: "batches",
});

Batch.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ==========================================
// SUPPLIER AND PURCHASE ASSOCIATIONS
// ==========================================

Supplier.hasMany(Purchase, {
  foreignKey: "supplierId",
  as: "purchases",
});

Purchase.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// ==========================================
// USER AND PURCHASE ASSOCIATIONS
// ==========================================

User.hasMany(Purchase, {
  foreignKey: "createdBy",
  as: "purchases",
});

Purchase.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// ==========================================
// PURCHASE AND PURCHASE ITEM ASSOCIATIONS
// ==========================================

Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items",
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// ==========================================
// MEDICINE AND PURCHASE ITEM ASSOCIATIONS
// ==========================================

Medicine.hasMany(PurchaseItem, {
  foreignKey: "medicineId",
  as: "purchaseItems",
});

PurchaseItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// ==========================================
// CUSTOMER AND PRESCRIPTION ASSOCIATIONS
// ==========================================

Customer.hasMany(Prescription, {
  foreignKey: "customerId",
  as: "prescriptions",
});

Prescription.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// ==========================================
// USER AND PRESCRIPTION ASSOCIATIONS
// ==========================================

User.hasMany(Prescription, {
  foreignKey: "createdBy",
  as: "prescriptions",
});

Prescription.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// ==========================================
// PRESCRIPTION AND PRESCRIPTION ITEM ASSOCIATIONS
// ==========================================

Prescription.hasMany(PrescriptionItem, {
  foreignKey: "prescriptionId",
  as: "items",
});

PrescriptionItem.belongsTo(Prescription, {
  foreignKey: "prescriptionId",
  as: "prescription",
});

// ==========================================
// MEDICINE AND PRESCRIPTION ITEM ASSOCIATIONS
// ==========================================

Medicine.hasMany(PrescriptionItem, {
  foreignKey: "medicineId",
  as: "prescriptionItems",
});

PrescriptionItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// ==========================================
// CUSTOMER AND SALE ASSOCIATIONS
// ==========================================

Customer.hasMany(Sale, {
  foreignKey: "customerId",
  as: "sales",
});

Sale.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// ==========================================
// USER AND SALE ASSOCIATIONS
// ==========================================

User.hasMany(Sale, {
  foreignKey: "createdBy",
  as: "sales",
});

Sale.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// ==========================================
// SALE AND SALE ITEM ASSOCIATIONS
// ==========================================

Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ==========================================
// MEDICINE AND SALE ITEM ASSOCIATIONS
// ==========================================

Medicine.hasMany(SaleItem, {
  foreignKey: "medicineId",
  as: "saleItems",
});

SaleItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// ==========================================
// PRESCRIPTION ITEM AND SALE ITEM ASSOCIATIONS
// ==========================================

PrescriptionItem.hasMany(SaleItem, {
  foreignKey: "prescriptionItemId",
  as: "saleItems",
});

SaleItem.belongsTo(PrescriptionItem, {
  foreignKey: "prescriptionItemId",
  as: "prescriptionItem",
});

// ==========================================
// BATCH AND SALE ITEM ASSOCIATIONS
// ==========================================

Batch.hasMany(SaleItem, {
  foreignKey: "batchId",
  as: "saleItems",
});

SaleItem.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

// ==========================================
// SALE AND PAYMENT ASSOCIATIONS
// ==========================================

Sale.hasMany(Payment, {
  foreignKey: "saleId",
  as: "payments",
});

Payment.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// ==========================================
// USER AND AUDIT LOG ASSOCIATIONS
// ==========================================

User.hasMany(AuditLog, {
  foreignKey: "userId",
  as: "auditLogs",
});

AuditLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ==========================================
// EXPORT SHARED DATABASE CONNECTION AND MODELS
// ==========================================

module.exports = {
  sequelize,
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
  Setting,
};
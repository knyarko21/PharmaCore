
const sequelize = require("../config/database");

// =========================================
// MODEL IMPORTS
// =========================================

const User = require("./User");
const Category = require("./Category");
const Medicine = require("./Medicine");
const Supplier = require("./Supplier");
const Batch = require("./Batch");
const Purchase = require("./Purchase");
const PurchaseItem = require("./PurchaseItem");
const Customer = require("./Customer");
const Doctor = require("./Doctor");
const Prescription = require("./Prescription");
const PrescriptionItem = require("./PrescriptionItem");
const Sale = require("./Sale");
const SaleItem = require("./SaleItem");
const Payment = require("./Payment");
const AuditLog = require("./AuditLog");
const Setting = require("./Setting");

// =========================================
// USER AND SETTINGS
// =========================================

User.hasOne(Setting, {
  foreignKey: "userId",
  as: "settings",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Setting.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// =========================================
// USER INVITATION RELATIONSHIP
// =========================================

// A user can invite multiple users.
User.hasMany(User, {
  foreignKey: "invitedByUserId",
  as: "invitees",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Each invited user can have one inviter.
User.belongsTo(User, {
  foreignKey: "invitedByUserId",
  as: "inviter",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// =========================================
// CATEGORY AND MEDICINE
// =========================================

Category.hasMany(Medicine, {
  foreignKey: "categoryId",
  as: "medicines",
});

Medicine.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// =========================================
// MEDICINE AND BATCH
// =========================================

Medicine.hasMany(Batch, {
  foreignKey: "medicineId",
  as: "batches",
});

Batch.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// =========================================
// SUPPLIER AND BATCH
// =========================================

Supplier.hasMany(Batch, {
  foreignKey: "supplierId",
  as: "batches",
});

Batch.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// =========================================
// SUPPLIER AND PURCHASE
// =========================================

Supplier.hasMany(Purchase, {
  foreignKey: "supplierId",
  as: "purchases",
});

Purchase.belongsTo(Supplier, {
  foreignKey: "supplierId",
  as: "supplier",
});

// =========================================
// USER AND PURCHASE
// =========================================

User.hasMany(Purchase, {
  foreignKey: "createdBy",
  as: "purchases",
});

Purchase.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// =========================================
// PURCHASE AND PURCHASE ITEMS
// =========================================

Purchase.hasMany(PurchaseItem, {
  foreignKey: "purchaseId",
  as: "items",
});

PurchaseItem.belongsTo(Purchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// =========================================
// MEDICINE AND PURCHASE ITEMS
// =========================================

Medicine.hasMany(PurchaseItem, {
  foreignKey: "medicineId",
  as: "purchaseItems",
});

PurchaseItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// =========================================
// CUSTOMER AND PRESCRIPTION
// =========================================

Customer.hasMany(Prescription, {
  foreignKey: "customerId",
  as: "prescriptions",
});

Prescription.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// =========================================
// DOCTOR AND PRESCRIPTION
// =========================================

Doctor.hasMany(Prescription, {
  foreignKey: "doctorId",
  as: "prescriptions",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Prescription.belongsTo(Doctor, {
  foreignKey: "doctorId",
  as: "doctor",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// =========================================
// USER AND PRESCRIPTION
// =========================================

User.hasMany(Prescription, {
  foreignKey: "createdBy",
  as: "prescriptions",
});

Prescription.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// =========================================
// PRESCRIPTION AND PRESCRIPTION ITEMS
// =========================================

Prescription.hasMany(PrescriptionItem, {
  foreignKey: "prescriptionId",
  as: "items",
});

PrescriptionItem.belongsTo(Prescription, {
  foreignKey: "prescriptionId",
  as: "prescription",
});

// =========================================
// MEDICINE AND PRESCRIPTION ITEMS
// =========================================

Medicine.hasMany(PrescriptionItem, {
  foreignKey: "medicineId",
  as: "prescriptionItems",
});

PrescriptionItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// =========================================
// CUSTOMER AND SALES
// =========================================

Customer.hasMany(Sale, {
  foreignKey: "customerId",
  as: "sales",
});

Sale.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// =========================================
// USER AND SALES
// =========================================

User.hasMany(Sale, {
  foreignKey: "createdBy",
  as: "sales",
});

Sale.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// =========================================
// SALE AND SALE ITEMS
// =========================================

Sale.hasMany(SaleItem, {
  foreignKey: "saleId",
  as: "items",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// =========================================
// MEDICINE AND SALE ITEMS
// =========================================

Medicine.hasMany(SaleItem, {
  foreignKey: "medicineId",
  as: "saleItems",
});

SaleItem.belongsTo(Medicine, {
  foreignKey: "medicineId",
  as: "medicine",
});

// =========================================
// PRESCRIPTION ITEMS AND SALE ITEMS
// =========================================

PrescriptionItem.hasMany(SaleItem, {
  foreignKey: "prescriptionItemId",
  as: "saleItems",
});

SaleItem.belongsTo(PrescriptionItem, {
  foreignKey: "prescriptionItemId",
  as: "prescriptionItem",
});

// =========================================
// BATCH AND SALE ITEMS
// =========================================

Batch.hasMany(SaleItem, {
  foreignKey: "batchId",
  as: "saleItems",
});

SaleItem.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

// =========================================
// SALE AND PAYMENTS
// =========================================

Sale.hasMany(Payment, {
  foreignKey: "saleId",
  as: "payments",
});

Payment.belongsTo(Sale, {
  foreignKey: "saleId",
  as: "sale",
});

// =========================================
// USER AND AUDIT LOGS
// =========================================

User.hasMany(AuditLog, {
  foreignKey: "userId",
  as: "auditLogs",
});

AuditLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// =========================================
// EXPORT DATABASE CONNECTION AND MODELS
// =========================================

module.exports = {
  sequelize,

  // Identity and access
  User,
  Setting,

  // Medicine and inventory
  Category,
  Medicine,
  Batch,

  // Suppliers and purchasing
  Supplier,
  Purchase,
  PurchaseItem,

  // Customers and prescriptions
  Customer,
  Doctor,
  Prescription,
  PrescriptionItem,

  // Sales and payment
  Sale,
  SaleItem,
  Payment,

  // System records
  AuditLog,
};
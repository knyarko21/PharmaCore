
"use strict";

require("dotenv").config();

const sequelize = require("../config/database");

const {
  User,
  Category,
  Medicine,
  Supplier,
  Batch,
  Purchase,
  PurchaseItem,
  Customer,
  Sale,
  SaleItem,
  Payment,
} = require("../models");

const SEED_MARKER = "[PHARMACORE-DEMO-SEED-V1]";
const SKU_PREFIX = "DEMO-PC-";
const CUSTOMER_EMAIL_PREFIX = "demo.customer.";
const CREATOR_ID = 1;

const DEMO_MEDICINES = [
  {
    key: "PARA",
    name: "Demo Paracetamol 500mg Tablets",
    genericName: "Paracetamol",
    dosageForm: "Tablet",
    strength: "500mg",
    sku: "DEMO-PC-PARA-500",
    purchasePrice: 2.0,
    sellingPrice: 3.5,
    categoryKeywords: ["pain relief", "analgesic"],
    reorderLevel: 15,
  },
  {
    key: "VITC",
    name: "Demo Vitamin C 500mg Tablets",
    genericName: "Ascorbic Acid",
    dosageForm: "Tablet",
    strength: "500mg",
    sku: "DEMO-PC-VITC-500",
    purchasePrice: 1.5,
    sellingPrice: 2.5,
    categoryKeywords: ["vitamin", "supplement"],
    reorderLevel: 15,
  },
  {
    key: "ORS",
    name: "Demo Oral Rehydration Salts",
    genericName: "Oral Rehydration Salts",
    dosageForm: "Sachet",
    strength: "Standard sachet",
    sku: "DEMO-PC-ORS-SACHET",
    purchasePrice: 1.2,
    sellingPrice: 2.0,
    categoryKeywords: ["digestive", "first aid"],
    reorderLevel: 20,
  },
  {
    key: "CET",
    name: "Demo Cetirizine 10mg Tablets",
    genericName: "Cetirizine",
    dosageForm: "Tablet",
    strength: "10mg",
    sku: "DEMO-PC-CET-10",
    purchasePrice: 2.5,
    sellingPrice: 4.0,
    categoryKeywords: ["cough", "cold", "allergy"],
    reorderLevel: 10,
  },
  {
    key: "ANT",
    name: "Demo Antiseptic Solution 100ml",
    genericName: "Antiseptic Solution",
    dosageForm: "Solution",
    strength: "100ml",
    sku: "DEMO-PC-ANTISEPTIC-100",
    purchasePrice: 5.0,
    sellingPrice: 8.0,
    categoryKeywords: ["first aid", "skin care"],
    reorderLevel: 10,
  },
];

const DEMO_CUSTOMERS = [
  {
    firstName: "Demo",
    lastName: "Customer One",
    phone: "0200000101",
    email: "demo.customer.01@example.com",
    address: "Demonstration Address, Kumasi",
    gender: "female",
  },
  {
    firstName: "Demo",
    lastName: "Customer Two",
    phone: "0200000102",
    email: "demo.customer.02@example.com",
    address: "Demonstration Address, Accra",
    gender: "male",
  },
  {
    firstName: "Demo",
    lastName: "Customer Three",
    phone: "0200000103",
    email: "demo.customer.03@example.com",
    address: "Demonstration Address, Kumasi",
    gender: "other",
  },
];

const DEMO_SALES = [
  {
    number: "DEMO-SALE-PC-001",
    customerIndex: 0,
    paymentMethod: "cash",
    items: [
      { key: "PARA", quantity: 3 },
      { key: "VITC", quantity: 2 },
    ],
  },
  {
    number: "DEMO-SALE-PC-002",
    customerIndex: 1,
    paymentMethod: "mobile_money",
    items: [
      { key: "ORS", quantity: 4 },
      { key: "CET", quantity: 2 },
    ],
  },
  {
    number: "DEMO-SALE-PC-003",
    customerIndex: 2,
    paymentMethod: "cash",
    items: [
      { key: "ANT", quantity: 2 },
      { key: "PARA", quantity: 2 },
    ],
  },
];

const REQUIRED_COLUMNS = {
  users: [
    "id",
    "role",
    "isActive",
    "approvalStatus",
  ],
  categories: [
    "id",
    "name",
    "isActive",
  ],
  medicines: [
    "id",
    "name",
    "genericName",
    "dosageForm",
    "strength",
    "sku",
    "reorderLevel",
    "isPrescriptionRequired",
    "isActive",
    "categoryId",
  ],
  suppliers: [
    "id",
    "name",
    "isActive",
  ],
  batches: [
    "id",
    "batchNumber",
    "quantity",
    "purchasePrice",
    "sellingPrice",
    "expiryDate",
    "manufactureDate",
    "medicineId",
    "supplierId",
  ],
  customers: [
    "id",
    "firstName",
    "lastName",
    "phone",
    "email",
    "address",
    "gender",
    "isActive",
  ],
  purchases: [
    "id",
    "purchaseNumber",
    "purchaseDate",
    "totalAmount",
    "status",
    "notes",
    "supplierId",
    "createdBy",
  ],
  purchase_items: [
    "id",
    "quantity",
    "unitPrice",
    "totalPrice",
    "purchaseId",
    "medicineId",
  ],
  sales: [
    "id",
    "saleNumber",
    "saleDate",
    "subtotal",
    "discount",
    "tax",
    "totalAmount",
    "status",
    "notes",
    "customerId",
    "createdBy",
  ],
  sale_items: [
    "id",
    "quantity",
    "unitPrice",
    "discount",
    "totalPrice",
    "saleId",
    "medicineId",
    "batchId",
  ],
  payments: [
    "id",
    "paymentReference",
    "amount",
    "paymentMethod",
    "status",
    "transactionReference",
    "notes",
    "paidAt",
    "saleId",
  ],
};

function stop(message) {
  throw new Error(message);
}

function money(value) {
  return Number(value.toFixed(2));
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function daysFromToday(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function categoryForMedicine(medicine, categories, index) {
  const active = categories.filter((category) => category.isActive);

  if (!active.length) {
    stop("No active categories exist. No records were created.");
  }

  const matched = active.find((category) => {
    const name = category.name.toLowerCase();

    return medicine.categoryKeywords.some((keyword) =>
      name.includes(keyword)
    );
  });

  // The preview will show the selected category.
  // This fallback allows the script to work with differently
  // named category lists without creating new categories.
  return matched || active[index % active.length];
}

async function verifyProductionTarget() {
  const mode = process.argv[2];

  if (!["--dry-run", "--apply"].includes(mode)) {
    stop(
      "Choose --dry-run or --apply. No database changes were made."
    );
  }

  if (process.env.PHARMACORE_SEED_TARGET !== "production") {
    stop(
      "Set PHARMACORE_SEED_TARGET=production explicitly. " +
      "No database changes were made."
    );
  }

  const host = String(process.env.DB_HOST || "").toLowerCase();
  const database = String(process.env.DB_NAME || "").toLowerCase();

  if (
    !host ||
    ["localhost", "127.0.0.1", "::1"].includes(host) ||
    host.includes("localhost")
  ) {
    stop(
      "The configured database host appears local or is missing. " +
      "Run this script only in the verified production environment."
    );
  }

  if (!database.includes("pharmacore")) {
    stop(
      "DB_NAME does not contain 'pharmacore'. " +
      "Verify the production database before proceeding."
    );
  }

  if (mode === "--apply" && process.argv[3] !== "--confirm-production") {
    stop(
      "Apply mode requires: --apply --confirm-production"
    );
  }

  await sequelize.authenticate();

  console.log("\nConnected to the configured database.");
  console.log(`Database name: ${process.env.DB_NAME}`);
  console.log(`Mode: ${mode === "--dry-run" ? "PREVIEW ONLY" : "APPLY"}`);

  return mode;
}

async function verifySchema() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((table) =>
    typeof table === "string" ? table : table.tableName
  );

  for (const [tableName, requiredColumns] of Object.entries(
    REQUIRED_COLUMNS
  )) {
    if (!tableNames.includes(tableName)) {
      stop(`Required table "${tableName}" is missing.`);
    }

    const columns = await queryInterface.describeTable(tableName);

    for (const column of requiredColumns) {
      if (!columns[column]) {
        stop(
          `Required column "${tableName}.${column}" is missing. ` +
          "No demo records were created."
        );
      }
    }
  }

  console.log("Schema checks passed.");
}

async function findExistingDemoRecords(transaction) {
  const demoMedicines = await Medicine.count({
    where: { sku: { [require("sequelize").Op.like]: `${SKU_PREFIX}%` } },
    transaction,
  });

  const demoCustomers = await Customer.count({
    where: {
      email: {
        [require("sequelize").Op.like]: `${CUSTOMER_EMAIL_PREFIX}%`,
      },
    },
    transaction,
  });

  const demoPurchases = await Purchase.count({
    where: { purchaseNumber: "DEMO-PUR-PC-001" },
    transaction,
  });

  const demoSales = await Sale.count({
    where: {
      saleNumber: {
        [require("sequelize").Op.like]: "DEMO-SALE-PC-%",
      },
    },
    transaction,
  });

  return {
    demoMedicines,
    demoCustomers,
    demoPurchases,
    demoSales,
  };
}

async function main() {
  let transaction;

  try {
    const mode = await verifyProductionTarget();

    await verifySchema();

    transaction = await sequelize.transaction();

    // Existing user ID 1 is expected to be the active,
    // approved administrator. We never edit the user.
    const creator = await User.findByPk(CREATOR_ID, { transaction });

    if (
      !creator ||
      creator.role !== "admin" ||
      !creator.isActive ||
      creator.approvalStatus !== "approved"
    ) {
      stop(
        "User ID 1 is not an active, approved administrator. " +
        "No demo records were created."
      );
    }

    const supplier = await Supplier.findByPk(1, { transaction });

    if (!supplier || !supplier.isActive) {
      stop(
        "Supplier ID 1 is missing or inactive. " +
        "No demo records were created."
      );
    }

    const categories = await Category.findAll({
      order: [["id", "ASC"]],
      transaction,
    });

    const existing = await findExistingDemoRecords(transaction);

    if (Object.values(existing).some((count) => count > 0)) {
      stop(
        "Demo seed records already exist. This script will not duplicate " +
        "or overwrite them. Existing demo counts: " +
        JSON.stringify(existing)
      );
    }

    const plannedMedicines = DEMO_MEDICINES.map((medicine, index) => ({
      ...medicine,
      category: categoryForMedicine(medicine, categories, index),
    }));

    const purchaseTotal = money(
      plannedMedicines.reduce(
        (sum, medicine) => sum + medicine.purchasePrice * 100,
        0
      )
    );

    const plannedSales = DEMO_SALES.map((sale) => {
      const subtotal = money(
        sale.items.reduce((sum, item) => {
          const medicine = plannedMedicines.find(
            (entry) => entry.key === item.key
          );

          return sum + medicine.sellingPrice * item.quantity;
        }, 0)
      );

      return { ...sale, subtotal, totalAmount: subtotal };
    });

    console.log("\n========== DEMO DATA PREVIEW ==========");
    console.log("Existing users to preserve: ALL");
    console.log(`Creator: ${creator.firstName} ${creator.lastName} (ID ${creator.id})`);
    console.log(`Supplier: ${supplier.name} (ID ${supplier.id})`);
    console.log(`New medicines: ${plannedMedicines.length}`);

    for (const medicine of plannedMedicines) {
      console.log(
        `  - ${medicine.name} | SKU ${medicine.sku} | ` +
        `Category: ${medicine.category.name} | ` +
        `Stock: 100 | Buy GH₵${medicine.purchasePrice.toFixed(2)} | ` +
        `Sell GH₵${medicine.sellingPrice.toFixed(2)}`
      );
    }

    console.log(`New fictional demo customers: ${DEMO_CUSTOMERS.length}`);
    console.log("New received purchase: DEMO-PUR-PC-001");
    console.log(`Purchase total: GH₵${purchaseTotal.toFixed(2)}`);
    console.log(`New completed sales: ${plannedSales.length}`);

    for (const sale of plannedSales) {
      console.log(
        `  - ${sale.number} | ${sale.paymentMethod} | ` +
        `Total GH₵${sale.totalAmount.toFixed(2)}`
      );
    }

    console.log("New linked payments: " + plannedSales.length);
    console.log("Existing records will not be updated or deleted.");
    console.log("=======================================\n");

    if (mode === "--dry-run") {
      await transaction.rollback();
      transaction = null;

      console.log("PREVIEW COMPLETE. No records were written.");
      console.log(
        "Review the category assignments and totals before applying."
      );

      return;
    }

    // All inserts below are inside one transaction.
    // If any operation fails, the entire seed is rolled back.

    const createdMedicines = {};

    for (const medicine of plannedMedicines) {
      const created = await Medicine.create(
        {
          name: medicine.name,
          genericName: medicine.genericName,
          brandName: null,
          dosageForm: medicine.dosageForm,
          strength: medicine.strength,
          description: `${SEED_MARKER} Demonstration catalogue item. Not for clinical use.`,
          sku: medicine.sku,
          reorderLevel: medicine.reorderLevel,
          isPrescriptionRequired: false,
          isActive: true,
          categoryId: medicine.category.id,
        },
        { transaction }
      );

      createdMedicines[medicine.key] = {
        ...medicine,
        record: created,
      };
    }

    const createdCustomers = [];

    for (const customer of DEMO_CUSTOMERS) {
      const created = await Customer.create(
        {
          ...customer,
          dateOfBirth: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          isActive: true,
        },
        { transaction }
      );

      createdCustomers.push(created);
    }

    const purchaseItems = plannedMedicines.map((medicine) => ({
      medicineId: createdMedicines[medicine.key].record.id,
      quantity: 100,
      unitPrice: medicine.purchasePrice,
      totalPrice: money(medicine.purchasePrice * 100),
    }));

    const purchase = await Purchase.create(
      {
        purchaseNumber: "DEMO-PUR-PC-001",
        purchaseDate: new Date(),
        totalAmount: purchaseTotal,
        status: "received",
        notes: `${SEED_MARKER} Demonstration purchase; linked demo batches created in the same transaction.`,
        supplierId: supplier.id,
        createdBy: creator.id,
      },
      { transaction }
    );

    const purchaseItemRecords = [];

    for (const item of purchaseItems) {
      const record = await PurchaseItem.create(
        {
          ...item,
          purchaseId: purchase.id,
        },
        { transaction }
      );

      purchaseItemRecords.push(record);
    }

    const batches = {};

    for (let index = 0; index < plannedMedicines.length; index += 1) {
      const medicine = plannedMedicines[index];
      const createdMedicine = createdMedicines[medicine.key];

      const batch = await Batch.create(
        {
          batchNumber: `DEMO-PC-BATCH-${medicine.key}`,
          quantity: 100,
          purchasePrice: medicine.purchasePrice,
          sellingPrice: medicine.sellingPrice,
          manufactureDate: dateOnly(daysFromToday(-120)),
          expiryDate: dateOnly(daysFromToday(540)),
          medicineId: createdMedicine.record.id,
          supplierId: supplier.id,
        },
        { transaction }
      );

      batches[medicine.key] = batch;
    }

    const createdSales = [];

    for (let saleIndex = 0; saleIndex < DEMO_SALES.length; saleIndex += 1) {
      const salePlan = DEMO_SALES[saleIndex];
      const customer = createdCustomers[salePlan.customerIndex];

      const itemDetails = salePlan.items.map((item) => {
        const medicine = createdMedicines[item.key];
        const batch = batches[item.key];

        return {
          medicine,
          batch,
          quantity: item.quantity,
          unitPrice: medicine.sellingPrice,
          discount: 0,
          totalPrice: money(medicine.sellingPrice * item.quantity),
        };
      });

      const subtotal = money(
        itemDetails.reduce((sum, item) => sum + item.totalPrice, 0)
      );

      const sale = await Sale.create(
        {
          saleNumber: salePlan.number,
          saleDate: new Date(),
          subtotal,
          discount: 0,
          tax: 0,
          totalAmount: subtotal,
          status: "completed",
          notes: `${SEED_MARKER} Demonstration sale.`,
          customerId: customer.id,
          createdBy: creator.id,
        },
        { transaction }
      );

      for (const item of itemDetails) {
        const batch = await Batch.findByPk(item.batch.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!batch || batch.quantity < item.quantity) {
          stop(
            `Insufficient stock for ${item.medicine.name}. ` +
            "The transaction will be rolled back."
          );
        }

        await SaleItem.create(
          {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            totalPrice: item.totalPrice,
            saleId: sale.id,
            medicineId: item.medicine.record.id,
            batchId: batch.id,
            prescriptionItemId: null,
          },
          { transaction }
        );

        await batch.update(
          { quantity: batch.quantity - item.quantity },
          { transaction }
        );
      }

      await Payment.create(
        {
          paymentReference: `DEMO-PC-PAY-${String(saleIndex + 1).padStart(3, "0")}`,
          amount: subtotal,
          paymentMethod: salePlan.paymentMethod,
          status: "completed",
          transactionReference: `DEMO-PC-TXN-${String(saleIndex + 1).padStart(3, "0")}`,
          notes: `${SEED_MARKER} Demonstration payment; not a real financial transaction.`,
          paidAt: new Date(),
          saleId: sale.id,
        },
        { transaction }
      );

      createdSales.push(sale);
    }

    await transaction.commit();
    transaction = null;

    console.log("\nDEMO SEED COMPLETED SUCCESSFULLY.");
    console.log(`Medicines created: ${plannedMedicines.length}`);
    console.log(`Customers created: ${createdCustomers.length}`);
    console.log("Purchases created: 1");
    console.log(`Purchase items created: ${purchaseItemRecords.length}`);
    console.log(`Batches created: ${plannedMedicines.length}`);
    console.log(`Sales created: ${createdSales.length}`);
    console.log(`Payments created: ${createdSales.length}`);
    console.log("Existing users and existing business records were preserved.");
    console.log(
      "Note: prescription examples were intentionally excluded."
    );
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("\nSEED STOPPED:");
    console.error(error.message);
    console.error("No partial demo transaction was committed.");

    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();

const sequelize = require("../config/database");
const Medicine = require("../models/Medicine");
const Category = require("../models/Category");

// ======================================================
// Sample Catalogue
// ======================================================
//
// 50 curated sample medicines across 22 categories.
// SKUs follow the pattern PC-DEMO-001 .. PC-DEMO-050.
//
// These records are intended for development / testing
// only. Descriptions explicitly mark them as sample data.
// ======================================================

const medicines = [
  // 1-5: Pain Relief
  {
    name: "Paracetamol 500 mg Tablets",
    genericName: "Paracetamol",
    dosageForm: "Tablet",
    strength: "500 mg",
    category: "Pain Relief",
    prescription: false
  },
  {
    name: "Ibuprofen 200 mg Tablets",
    genericName: "Ibuprofen",
    dosageForm: "Tablet",
    strength: "200 mg",
    category: "Pain Relief",
    prescription: false
  },
  {
    name: "Diclofenac Gel",
    genericName: "Diclofenac",
    dosageForm: "Gel",
    strength: "1%",
    category: "Pain Relief",
    prescription: false
  },
  {
    name: "Naproxen Tablets",
    genericName: "Naproxen",
    dosageForm: "Tablet",
    strength: "250 mg",
    category: "Pain Relief",
    prescription: true
  },
  {
    name: "Aspirin Tablets",
    genericName: "Acetylsalicylic acid",
    dosageForm: "Tablet",
    strength: "300 mg",
    category: "Pain Relief",
    prescription: false
  },

  // 6-10: Antibiotics
  {
    name: "Amoxicillin Capsules",
    genericName: "Amoxicillin",
    dosageForm: "Capsule",
    strength: "500 mg",
    category: "Antibiotics",
    prescription: true
  },
  {
    name: "Azithromycin Tablets",
    genericName: "Azithromycin",
    dosageForm: "Tablet",
    strength: "250 mg",
    category: "Antibiotics",
    prescription: true
  },
  {
    name: "Doxycycline Capsules",
    genericName: "Doxycycline",
    dosageForm: "Capsule",
    strength: "100 mg",
    category: "Antibiotics",
    prescription: true
  },
  {
    name: "Cephalexin Capsules",
    genericName: "Cephalexin",
    dosageForm: "Capsule",
    strength: "500 mg",
    category: "Antibiotics",
    prescription: true
  },
  {
    name: "Metronidazole Tablets",
    genericName: "Metronidazole",
    dosageForm: "Tablet",
    strength: "400 mg",
    category: "Antibiotics",
    prescription: true
  },

  // 11-13: Antimalarials
  {
    name: "Artemether-Lumefantrine Tablets",
    genericName: "Artemether-Lumefantrine",
    dosageForm: "Tablet",
    strength: "20 mg/120 mg",
    category: "Antimalarials",
    prescription: true
  },
  {
    name: "Artesunate-Amodiaquine Tablets",
    genericName: "Artesunate-Amodiaquine",
    dosageForm: "Tablet",
    strength: "Combination",
    category: "Antimalarials",
    prescription: true
  },
  {
    name: "Quinine Tablets",
    genericName: "Quinine",
    dosageForm: "Tablet",
    strength: "300 mg",
    category: "Antimalarials",
    prescription: true
  },

  // 14-15: Allergy & Antihistamines
  {
    name: "Cetirizine Tablets",
    genericName: "Cetirizine",
    dosageForm: "Tablet",
    strength: "10 mg",
    category: "Allergy & Antihistamines",
    prescription: false
  },
  {
    name: "Loratadine Tablets",
    genericName: "Loratadine",
    dosageForm: "Tablet",
    strength: "10 mg",
    category: "Allergy & Antihistamines",
    prescription: false
  },

  // 16-17: Cold, Cough & Flu
  {
    name: "Chlorpheniramine Tablets",
    genericName: "Chlorpheniramine",
    dosageForm: "Tablet",
    strength: "4 mg",
    category: "Cold, Cough & Flu",
    prescription: false
  },
  {
    name: "Dextromethorphan Cough Syrup",
    genericName: "Dextromethorphan",
    dosageForm: "Syrup",
    strength: "Demo formulation",
    category: "Cold, Cough & Flu",
    prescription: false
  },

  // 18: Respiratory Care
  {
    name: "Saline Nasal Spray",
    genericName: "Sodium chloride",
    dosageForm: "Nasal Spray",
    strength: "0.9%",
    category: "Respiratory Care",
    prescription: false
  },

  // 19-22: Vitamins & Supplements
  {
    name: "Vitamin C Tablets",
    genericName: "Ascorbic acid",
    dosageForm: "Tablet",
    strength: "500 mg",
    category: "Vitamins & Supplements",
    prescription: false
  },
  {
    name: "Multivitamin Tablets",
    genericName: "Multivitamins",
    dosageForm: "Tablet",
    strength: "Combination",
    category: "Vitamins & Supplements",
    prescription: false
  },
  {
    name: "Vitamin D3 Capsules",
    genericName: "Cholecalciferol",
    dosageForm: "Capsule",
    strength: "1000 IU",
    category: "Vitamins & Supplements",
    prescription: false
  },
  {
    name: "Zinc Supplement Tablets",
    genericName: "Zinc",
    dosageForm: "Tablet",
    strength: "20 mg",
    category: "Vitamins & Supplements",
    prescription: false
  },

  // 23-24: Digestive Health
  {
    name: "Oral Rehydration Salts",
    genericName: "Oral rehydration salts",
    dosageForm: "Powder Sachet",
    strength: "Standard sachet",
    category: "Digestive Health",
    prescription: false
  },
  {
    name: "Antacid Suspension",
    genericName: "Antacid combination",
    dosageForm: "Suspension",
    strength: "Demo formulation",
    category: "Digestive Health",
    prescription: false
  },

  // 25-26: Gastrointestinal Medicines
  {
    name: "Omeprazole Capsules",
    genericName: "Omeprazole",
    dosageForm: "Capsule",
    strength: "20 mg",
    category: "Gastrointestinal Medicines",
    prescription: true
  },
  {
    name: "Loperamide Capsules",
    genericName: "Loperamide",
    dosageForm: "Capsule",
    strength: "2 mg",
    category: "Gastrointestinal Medicines",
    prescription: false
  },

  // 27-28: Diabetes Care
  {
    name: "Metformin Tablets",
    genericName: "Metformin",
    dosageForm: "Tablet",
    strength: "500 mg",
    category: "Diabetes Care",
    prescription: true
  },
  {
    name: "Glimepiride Tablets",
    genericName: "Glimepiride",
    dosageForm: "Tablet",
    strength: "2 mg",
    category: "Diabetes Care",
    prescription: true
  },

  // 29-30: Blood Pressure
  {
    name: "Amlodipine Tablets",
    genericName: "Amlodipine",
    dosageForm: "Tablet",
    strength: "5 mg",
    category: "Blood Pressure",
    prescription: true
  },
  {
    name: "Losartan Tablets",
    genericName: "Losartan",
    dosageForm: "Tablet",
    strength: "50 mg",
    category: "Blood Pressure",
    prescription: true
  },

  // 31-32: Cardiovascular Medicines
  {
    name: "Lisinopril Tablets",
    genericName: "Lisinopril",
    dosageForm: "Tablet",
    strength: "10 mg",
    category: "Cardiovascular Medicines",
    prescription: true
  },
  {
    name: "Atorvastatin Tablets",
    genericName: "Atorvastatin",
    dosageForm: "Tablet",
    strength: "10 mg",
    category: "Cardiovascular Medicines",
    prescription: true
  },

  // 33-35: Skin Care & Dermatology
  {
    name: "Hydrocortisone Cream",
    genericName: "Hydrocortisone",
    dosageForm: "Cream",
    strength: "1%",
    category: "Skin Care & Dermatology",
    prescription: false
  },
  {
    name: "Clotrimazole Cream",
    genericName: "Clotrimazole",
    dosageForm: "Cream",
    strength: "1%",
    category: "Skin Care & Dermatology",
    prescription: false
  },
  {
    name: "Calamine Lotion",
    genericName: "Calamine",
    dosageForm: "Lotion",
    strength: "Standard formulation",
    category: "Skin Care & Dermatology",
    prescription: false
  },

  // 36-37: Eye Care
  {
    name: "Lubricating Eye Drops",
    genericName: "Ocular lubricant",
    dosageForm: "Eye Drops",
    strength: "Demo formulation",
    category: "Eye Care",
    prescription: false
  },
  {
    name: "Chloramphenicol Eye Drops",
    genericName: "Chloramphenicol",
    dosageForm: "Eye Drops",
    strength: "0.5%",
    category: "Eye Care",
    prescription: true
  },

  // 38: Ear Care
  {
    name: "Ear Wax Softening Drops",
    genericName: "Ear wax softener",
    dosageForm: "Ear Drops",
    strength: "Demo formulation",
    category: "Ear Care",
    prescription: false
  },

  // 39: First Aid
  {
    name: "Antiseptic Solution",
    genericName: "Antiseptic",
    dosageForm: "Solution",
    strength: "Demo formulation",
    category: "First Aid",
    prescription: false
  },

  // 40: Medical Supplies
  {
    name: "Adhesive Bandages",
    genericName: "Adhesive dressing",
    dosageForm: "Medical Supply",
    strength: "Pack",
    category: "Medical Supplies",
    prescription: false
  },

  // 41-42: Wound Care
  {
    name: "Povidone-Iodine Solution",
    genericName: "Povidone-iodine",
    dosageForm: "Solution",
    strength: "10%",
    category: "Wound Care",
    prescription: false
  },
  {
    name: "Sterile Gauze Dressing",
    genericName: "Gauze dressing",
    dosageForm: "Dressing",
    strength: "Pack",
    category: "Wound Care",
    prescription: false
  },

  // 43-44: Women's Health
  {
    name: "Folic Acid Tablets",
    genericName: "Folic acid",
    dosageForm: "Tablet",
    strength: "5 mg",
    category: "Women's Health",
    prescription: false
  },
  {
    name: "Ferrous Sulfate Tablets",
    genericName: "Ferrous sulfate",
    dosageForm: "Tablet",
    strength: "200 mg",
    category: "Women's Health",
    prescription: false
  },

  // 45-46: Sexual Health
  {
    name: "Condoms",
    genericName: "Barrier contraceptive",
    dosageForm: "Medical Device",
    strength: "Pack",
    category: "Sexual Health",
    prescription: false
  },
  {
    name: "Sildenafil Tablets",
    genericName: "Sildenafil",
    dosageForm: "Tablet",
    strength: "50 mg",
    category: "Sexual Health",
    prescription: true
  },

  // 47-48: Children's Medicines
  {
    name: "Children's Paracetamol Suspension",
    genericName: "Paracetamol",
    dosageForm: "Oral Suspension",
    strength: "Demo formulation",
    category: "Children's Medicines",
    prescription: false
  },
  {
    name: "Zinc Sulfate Dispersible Tablets",
    genericName: "Zinc sulfate",
    dosageForm: "Dispersible Tablet",
    strength: "20 mg",
    category: "Children's Medicines",
    prescription: false
  },

  // 49-50: Diagnostic Supplies
  {
    name: "Digital Thermometer",
    genericName: "Digital thermometer",
    dosageForm: "Diagnostic Device",
    strength: "Unit",
    category: "Diagnostic Supplies",
    prescription: false
  },
  {
    name: "Blood Glucose Test Strips",
    genericName: "Glucose test strips",
    dosageForm: "Diagnostic Supply",
    strength: "Pack",
    category: "Diagnostic Supplies",
    prescription: false
  }
];

// ======================================================
// Helpers
// ======================================================

const buildSku = (index) => `PC-DEMO-${String(index + 1).padStart(3, "0")}`;

const buildDefaults = (item, categoryId, sku) => ({
  name: item.name,
  genericName: item.genericName,
  brandName: null,
  dosageForm: item.dosageForm,
  strength: item.strength,
  description: "Sample catalogue record for software testing only.",
  sku,
  reorderLevel: 10,
  isPrescriptionRequired: item.prescription,
  isActive: true,
  categoryId
});

const getMissingCategories = (categoryMap) => [
  ...new Set(
    medicines
      .map((medicine) => medicine.category)
      .filter((name) => !categoryMap.has(name))
  )
];

// ======================================================
// Seeder
// ======================================================

async function seedMedicines() {
  let transaction;

  try {
    await sequelize.authenticate();

    console.log("=================================");
    console.log("PharmaCore — Medicine Seed");
    console.log("=================================");
    console.log("Connected to the PharmaCore database.");
    console.log(`Sample records prepared: ${medicines.length}`);

    if (medicines.length !== 50) {
      throw new Error(
        `Expected 50 sample medicines, found ${medicines.length}.`
      );
    }

    transaction = await sequelize.transaction();

    // --------------------------------------------------
    // Resolve category IDs
    // --------------------------------------------------

    const categories = await Category.findAll({
      where: { isActive: true },
      transaction
    });

    const categoryMap = new Map(
      categories.map((category) => [category.name, category.id])
    );

    const missingCategories = getMissingCategories(categoryMap);

    if (missingCategories.length > 0) {
      throw new Error(
        `Missing or inactive categories: ${missingCategories.join(", ")}`
      );
    }

    // --------------------------------------------------
    // Seed medicines
    // --------------------------------------------------

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < medicines.length; i += 1) {
      const item = medicines[i];
      const sku = buildSku(i);
      const categoryId = categoryMap.get(item.category);

      const [medicine, wasCreated] = await Medicine.findOrCreate({
        where: { sku },
        defaults: buildDefaults(item, categoryId, sku),
        transaction
      });

      if (wasCreated) {
        created += 1;
        console.log(`Created: ${medicine.name} (${sku})`);
      } else {
        skipped += 1;
        console.log(`Skipped existing: ${sku}`);
      }
    }

    await transaction.commit();
    transaction = null;

    console.log("");
    console.log("Seeding completed successfully.");
    console.log(`Created:          ${created}`);
    console.log(`Already existed:  ${skipped}`);
    console.log(`Total processed:  ${created + skipped}`);
    console.log("=================================");
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    console.error("");
    console.error("Medicine seeding failed.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seedMedicines();
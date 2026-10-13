
const sequelize = require("../config/database");
const Category = require("../models/Category");

// ======================================================
// Sample Categories
// ======================================================
//
// 22 categories that match the categories referenced by
// seedMedicines.js. Run this BEFORE seeding medicines.
// ======================================================

const categories = [
  {
    name: "Pain Relief",
    description: "Analgesics and anti-inflammatory medicines."
  },
  {
    name: "Antibiotics",
    description: "Antibacterial medicines."
  },
  {
    name: "Antimalarials",
    description: "Malaria treatment and prophylaxis."
  },
  {
    name: "Allergy & Antihistamines",
    description: "Allergy relief and antihistamine products."
  },
  {
    name: "Cold, Cough & Flu",
    description: "Cold and flu symptom relief."
  },
  {
    name: "Respiratory Care",
    description: "Nasal and respiratory support products."
  },
  {
    name: "Vitamins & Supplements",
    description: "Nutritional and vitamin supplementation."
  },
  {
    name: "Digestive Health",
    description: "Oral rehydration and digestive support."
  },
  {
    name: "Gastrointestinal Medicines",
    description: "Stomach and gut medicines."
  },
  {
    name: "Diabetes Care",
    description: "Blood sugar management medicines."
  },
  {
    name: "Blood Pressure",
    description: "Hypertension management medicines."
  },
  {
    name: "Cardiovascular Medicines",
    description: "Heart and cholesterol medicines."
  },
  {
    name: "Skin Care & Dermatology",
    description: "Creams, lotions, and skin treatments."
  },
  {
    name: "Eye Care",
    description: "Ophthalmic drops and eye treatments."
  },
  {
    name: "Ear Care",
    description: "Otic drops and ear treatments."
  },
  {
    name: "First Aid",
    description: "Antiseptics and emergency supplies."
  },
  {
    name: "Medical Supplies",
    description: "General medical supplies and devices."
  },
  {
    name: "Wound Care",
    description: "Dressings and wound treatment products."
  },
  {
    name: "Women's Health",
    description: "Reproductive and maternal health supplements."
  },
  {
    name: "Sexual Health",
    description: "Contraceptives and sexual health products."
  },
  {
    name: "Children's Medicines",
    description: "Paediatric formulations."
  },
  {
    name: "Diagnostic Supplies",
    description: "Test strips, thermometers, and diagnostic devices."
  }
];

// ======================================================
// Seeder
// ======================================================

async function seedCategories() {
  let transaction;

  try {
    await sequelize.authenticate();

    console.log("=================================");
    console.log("PharmaCore — Category Seed");
    console.log("=================================");
    console.log("Connected to the PharmaCore database.");
    console.log(`Sample records prepared: ${categories.length}`);

    transaction = await sequelize.transaction();

    let created = 0;
    let skipped = 0;

    for (const item of categories) {
      const [category, wasCreated] = await Category.findOrCreate({
        where: { name: item.name },
        defaults: {
          name: item.name,
          description: item.description,
          isActive: true
        },
        transaction
      });

      if (wasCreated) {
        created += 1;
        console.log(`Created: ${category.name}`);
      } else {
        skipped += 1;
        console.log(`Skipped existing: ${category.name}`);
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
    console.error("Category seeding failed.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seedCategories();
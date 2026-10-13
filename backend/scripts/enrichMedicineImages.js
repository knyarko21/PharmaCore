
const axios = require("axios");

const sequelize = require("../config/database");
const { Medicine } = require("../models");

// ======================================================
// Config
// ======================================================

const PLACEHOLDER_COLOR = "8b5cf6";

const FORCE_REFRESH = true;

// Wikimedia Commons API endpoint
const WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php";

// ======================================================
// Helpers
// ======================================================

const buildPlaceholder = (medicineName) =>
  `https://placehold.co/800x800/${PLACEHOLDER_COLOR}/ffffff/png?text=${encodeURIComponent(
    medicineName
  )}`;

// Try several search variants so common medicines
// resolve to real photos.
const buildSearchQueries = (medicine) => {
  const queries = [];

  const generic = (medicine.genericName || "").trim();
  const name = (medicine.name || "").trim();
  const dosage = (medicine.dosageForm || "").trim();

  if (generic) queries.push(generic);
  if (dosage) queries.push(`${generic} ${dosage}`.trim());
  if (name) queries.push(name);

  return queries.filter(Boolean);
};

const queryWikimedia = async (searchTerm) => {
  try {
    const response = await axios.get(WIKIMEDIA_API, {
      params: {
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: searchTerm,
        gsrnamespace: 6, // File namespace only
        gsrlimit: 5,
        prop: "imageinfo",
        iiprop: "url|size|mime",
        iiurlwidth: 800,
        origin: "*"
      },
      headers: {
        "User-Agent":
          "PharmaCore/1.0 (educational project; contact: dev@pharmacore.local)"
      },
      timeout: 15000
    });

    const pages = response.data?.query?.pages;

    if (!pages) return null;

    // Pick the first image that:
    //  - has a mime type we can display
    //  - has reasonable dimensions
    const candidates = Object.values(pages);

    for (const page of candidates) {
      const info = page.imageinfo?.[0];
      if (!info) continue;

      const mime = info.mime || "";
      const ok =
        mime === "image/jpeg" ||
        mime === "image/png" ||
        mime === "image/webp";

      if (!ok) continue;

      // Prefer the resized thumb (800px wide)
      const url = info.thumburl || info.url;

      if (url) return url;
    }

    return null;
  } catch (error) {
    console.error(
      `  ⚠ Wikimedia query failed for "${searchTerm}":`,
      error.message
    );
    return null;
  }
};

const fetchImageForMedicine = async (medicine) => {
  const queries = buildSearchQueries(medicine);

  for (const query of queries) {
    const url = await queryWikimedia(query);

    if (url) {
      console.log(`  ✓ Matched on "${query}"`);
      return url;
    }

    // Be polite between variants
    await new Promise((r) => setTimeout(r, 150));
  }

  return null;
};

// ======================================================
// Main
// ======================================================

async function enrichMedicineImages() {
  try {
    await sequelize.authenticate();

    console.log("=================================");
    console.log("PharmaCore — Medicine Image Enrichment");
    console.log("Source: Wikimedia Commons");
    console.log("=================================");
    console.log(`Force refresh: ${FORCE_REFRESH ? "ON" : "OFF"}`);
    console.log("");

    const medicines = await Medicine.findAll();

    console.log(`Found ${medicines.length} medicines to process.`);

    let enriched = 0;
    let refreshed = 0;
    let placeholders = 0;

    for (const medicine of medicines) {
      if (!FORCE_REFRESH && medicine.imageUrl) {
        console.log(`→ Skipped: ${medicine.name}`);
        continue;
      }

      console.log(`→ Searching: ${medicine.name}`);

      const imageUrl = await fetchImageForMedicine(medicine);

      if (imageUrl) {
        const hadImage = Boolean(medicine.imageUrl);

        medicine.imageUrl = imageUrl;
        await medicine.save();

        if (hadImage) refreshed += 1;
        else enriched += 1;

        console.log(`  → ${imageUrl}`);
      } else {
        medicine.imageUrl = buildPlaceholder(medicine.name);
        await medicine.save();
        placeholders += 1;
        console.log(`  ⚠ No match — placeholder`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    console.log("");
    console.log("=================================");
    console.log(`Enriched:     ${enriched}`);
    console.log(`Refreshed:    ${refreshed}`);
    console.log(`Placeholders: ${placeholders}`);
    console.log(`Total:        ${medicines.length}`);
    console.log("=================================");
  } catch (error) {
    console.error("Image enrichment failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

enrichMedicineImages();
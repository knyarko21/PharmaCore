require("dotenv").config();

const fs = require("fs");
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

async function main() {
  if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME
  ) {
    throw new Error("Required database environment variables are missing.");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      ca: fs.readFileSync("config/ca.pem", "utf8"),
      rejectUnauthorized: true,
    },
  });

  try {
    const [identity] = await db.query(
      "SELECT DATABASE() AS databaseName"
    );

    console.log("Connected database:", identity[0].databaseName);
    console.log("Mode:", APPLY ? "APPLY CHANGES" : "PREVIEW ONLY");

    if (identity[0].databaseName !== "defaultdb") {
      throw new Error("Unexpected database. Expected defaultdb; stopping.");
    }

    const [columns] = await db.query(
      "SHOW FULL COLUMNS FROM audit_logs LIKE 'action'"
    );

    if (columns.length !== 1) {
      throw new Error("Could not identify audit_logs.action.");
    }

    const currentType = String(columns[0].Type).toLowerCase();

    console.log("Current action column type:", currentType);

    if (currentType === "varchar(100)") {
      console.log("SKIP: audit_logs.action is already VARCHAR(100).");
      return;
    }

    if (!currentType.startsWith("enum(")) {
      throw new Error(
        `Unexpected action column type: ${currentType}. Stopping safely.`
      );
    }

    if (columns[0].Null !== "NO") {
      throw new Error(
        "Unexpected NULL setting on audit_logs.action. Stopping safely."
      );
    }

    const sql = `
      ALTER TABLE audit_logs
      MODIFY COLUMN action VARCHAR(100) NOT NULL
    `;

    console.log("\nPlanned change:");
    console.log(sql.trim());

    if (APPLY) {
      await db.query(sql);
      console.log("\nMigration applied successfully.");

      const [verification] = await db.query(
        "SHOW FULL COLUMNS FROM audit_logs LIKE 'action'"
      );

      console.log("Verified column type:", verification[0].Type);

      if (
        String(verification[0].Type).toLowerCase() !== "varchar(100)"
      ) {
        throw new Error("Post-migration verification failed.");
      }

      console.log("Verification successful.");
    } else {
      console.log("\nPREVIEW ONLY. No database changes were made.");
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("\nMigration stopped:", error.message);
  process.exitCode = 1;
});

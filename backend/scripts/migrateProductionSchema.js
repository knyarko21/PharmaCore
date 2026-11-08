require("dotenv").config();

const fs = require("fs");
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    throw new Error("Database environment variables are missing.");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      ca: fs.readFileSync("config/ca.pem", "utf8"),
      rejectUnauthorized: true,
    },
  });

  async function columnExists(table, column) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );

    return Number(rows[0].total) > 0;
  }

  async function indexExists(table, column, uniqueOnly = false) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
         ${uniqueOnly ? "AND NON_UNIQUE = 0" : ""}`,
      [table, column]
    );

    return Number(rows[0].total) > 0;
  }

  async function foreignKeyExists(table, column, referencedTable) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME = ?`,
      [table, column, referencedTable]
    );

    return Number(rows[0].total) > 0;
  }

  async function tableExists(table) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?`,
      [table]
    );

    return Number(rows[0].total) > 0;
  }

  async function executeChange(description, sql) {
    console.log(`\n${APPLY ? "APPLY" : "PREVIEW"}: ${description}`);
    console.log(sql.trim());

    if (APPLY) {
      await db.query(sql);
      console.log("Completed.");
    }
  }

  try {
    const [identity] = await db.query(
      "SELECT DATABASE() AS databaseName"
    );

    console.log("Connected database:", identity[0].databaseName);
    console.log("Mode:", APPLY ? "APPLY CHANGES" : "PREVIEW ONLY");

    if (identity[0].databaseName !== "defaultdb") {
      throw new Error(
        "Unexpected database. Expected defaultdb; stopping."
      );
    }

    // --------------------------------------------------
    // 1. USERS ROLE COLUMN
    // --------------------------------------------------

    const [roleColumns] = await db.query(
      "SHOW FULL COLUMNS FROM users LIKE 'role'"
    );

    if (roleColumns.length !== 1) {
      throw new Error("Could not identify users.role.");
    }

    if (roleColumns[0].Type.toLowerCase() !== "varchar(255)") {
      await executeChange(
        "Convert users.role to VARCHAR(255)",
        `ALTER TABLE users
         MODIFY COLUMN role VARCHAR(255)
         NOT NULL DEFAULT 'cashier'`
      );
    } else {
      console.log("\nSKIP: users.role is already VARCHAR(255).");
    }

    // --------------------------------------------------
    // 2. USER REGISTRATION AND EMAIL VERIFICATION FIELDS
    // --------------------------------------------------

    const userColumns = [
      {
        name: "requestedRole",
        sql: "`requestedRole` VARCHAR(255) NULL DEFAULT NULL",
      },
      {
        name: "isEmailVerified",
        sql: "`isEmailVerified` TINYINT(1) NOT NULL DEFAULT 0",
      },
      {
        name: "emailVerificationToken",
        sql: "`emailVerificationToken` VARCHAR(255) NULL DEFAULT NULL",
      },
      {
        name: "emailVerificationExpiresAt",
        sql: "`emailVerificationExpiresAt` DATETIME NULL DEFAULT NULL",
      },
    ];

    for (const column of userColumns) {
      if (!(await columnExists("users", column.name))) {
        await executeChange(
          `Add users.${column.name}`,
          `ALTER TABLE users ADD COLUMN ${column.sql}`
        );
      } else {
        console.log(`\nSKIP: users.${column.name} already exists.`);
      }
    }

    if (!(await indexExists("users", "emailVerificationToken", true))) {
      await executeChange(
        "Add unique index for emailVerificationToken",
        `ALTER TABLE users
         ADD UNIQUE KEY uq_users_emailVerificationToken
         (emailVerificationToken)`
      );
    } else {
      console.log("\nSKIP: Email verification token unique index exists.");
    }

    // Existing accounts created before email verification was introduced
    // have no verification token. Preserve their ability to sign in.
    // Pending approval and inactive-account restrictions remain unchanged.

    await executeChange(
      "Mark legacy tokenless accounts as email verified",
      `UPDATE users
       SET isEmailVerified = 1
       WHERE id BETWEEN 1 AND 23
         AND isEmailVerified = 0
         AND emailVerificationToken IS NULL`
    );

    // --------------------------------------------------
    // 3. MEDICINE IMAGE FIELD
    // --------------------------------------------------

    if (!(await columnExists("medicines", "imagePublicId"))) {
      await executeChange(
        "Add medicines.imagePublicId",
        `ALTER TABLE medicines
         ADD COLUMN imagePublicId VARCHAR(255) NULL DEFAULT NULL`
      );
    } else {
      console.log("\nSKIP: medicines.imagePublicId already exists.");
    }

    // --------------------------------------------------
    // 4. DOCTORS TABLE
    // --------------------------------------------------

    if (!(await tableExists("doctors"))) {
      await executeChange(
        "Create doctors table",
        `CREATE TABLE doctors (
          id INT NOT NULL AUTO_INCREMENT,
          doctorCode VARCHAR(30) NULL DEFAULT NULL,
          fullName VARCHAR(150) NOT NULL,
          licenseNumber VARCHAR(100) NOT NULL,
          specialization VARCHAR(150) NULL DEFAULT NULL,
          phone VARCHAR(30) NULL DEFAULT NULL,
          email VARCHAR(150) NULL DEFAULT NULL,
          facility VARCHAR(150) NULL DEFAULT NULL,
          isActive TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uq_doctors_doctorCode (doctorCode),
          UNIQUE KEY uq_doctors_licenseNumber (licenseNumber)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    } else {
      console.log("\nSKIP: doctors table already exists.");
    }

    // --------------------------------------------------
    // 5. PRESCRIPTION-TO-DOCTOR RELATIONSHIP
    // --------------------------------------------------

    if (!(await columnExists("prescriptions", "doctorId"))) {
      await executeChange(
        "Add nullable prescriptions.doctorId",
        `ALTER TABLE prescriptions
         ADD COLUMN doctorId INT NULL DEFAULT NULL`
      );
    } else {
      console.log("\nSKIP: prescriptions.doctorId already exists.");
    }

    if (!(await indexExists("prescriptions", "doctorId"))) {
      await executeChange(
        "Add prescriptions.doctorId index",
        `ALTER TABLE prescriptions
         ADD INDEX idx_prescriptions_doctorId (doctorId)`
      );
    } else {
      console.log("\nSKIP: prescriptions.doctorId index exists.");
    }

    if (
      !(await foreignKeyExists(
        "prescriptions",
        "doctorId",
        "doctors"
      ))
    ) {
      await executeChange(
        "Add prescriptions-to-doctors foreign key",
        `ALTER TABLE prescriptions
         ADD CONSTRAINT fk_prescriptions_doctor
         FOREIGN KEY (doctorId)
         REFERENCES doctors(id)
         ON DELETE SET NULL
         ON UPDATE CASCADE`
      );
    } else {
      console.log("\nSKIP: Doctor foreign key already exists.");
    }

    console.log("\nMigration script finished.");
    console.log(
      APPLY
        ? "Changes were submitted. Verification is still required."
        : "PREVIEW ONLY. No database changes were made."
    );
  } finally {
    await db.end();
  }
}

main().catch(error => {
  console.error("\nMigration stopped:", error.message);
  process.exitCode = 1;
});


require("dotenv").config();

const sequelize = require("../config/database");

const APPLY = process.argv.includes("--apply");

const TABLE = "users";

const EXPECTED_DATABASE = "defaultdb";

async function columnExists(columnName) {
  const [rows] = await sequelize.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    {
      replacements: [TABLE, columnName],
    }
  );

  return Number(rows[0].total) > 0;
}

async function indexExists(indexName) {
  const [rows] = await sequelize.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `,
    {
      replacements: [TABLE, indexName],
    }
  );

  return Number(rows[0].total) > 0;
}

async function foreignKeyExists(constraintName) {
  const [rows] = await sequelize.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND COLUMN_NAME = 'invitedByUserId'
        AND REFERENCED_TABLE_NAME = 'users'
        AND REFERENCED_COLUMN_NAME = 'id'
    `,
    {
      replacements: [TABLE, constraintName],
    }
  );

  return Number(rows[0].total) > 0;
}

async function executeChange(description, sql) {
  console.log(`\n${APPLY ? "APPLY" : "PREVIEW"}: ${description}`);
  console.log(sql.trim());

  if (APPLY) {
    await sequelize.query(sql);
    console.log("Executed successfully.");
  }
}

async function main() {
  try {
    // =====================================
    // VERIFY DATABASE CONNECTION
    // =====================================

    const [identity] = await sequelize.query(
      "SELECT DATABASE() AS databaseName"
    );

    const databaseName = identity[0].databaseName;

    console.log("Connected database:", databaseName);
    console.log("Mode:", APPLY ? "APPLY CHANGES" : "PREVIEW ONLY");

    if (databaseName !== EXPECTED_DATABASE) {
      throw new Error(
        `Unexpected database. Expected ${EXPECTED_DATABASE}; stopping.`
      );
    }

    // =====================================
    // VERIFY USERS TABLE
    // =====================================

    const [tables] = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
      `
    );

    if (Number(tables[0].total) !== 1) {
      throw new Error("The users table was not found.");
    }

    // =====================================
    // ADD INVITATION TOKEN HASH
    // =====================================

    if (!(await columnExists("invitationTokenHash"))) {
      await executeChange(
        "Add invitationTokenHash column",
        `
          ALTER TABLE users
          ADD COLUMN invitationTokenHash VARCHAR(64) NULL
        `
      );
    } else {
      console.log("\nSKIP: invitationTokenHash already exists.");
    }

    // =====================================
    // ADD INVITATION EXPIRY
    // =====================================

    if (!(await columnExists("invitationExpiresAt"))) {
      await executeChange(
        "Add invitationExpiresAt column",
        `
          ALTER TABLE users
          ADD COLUMN invitationExpiresAt DATETIME NULL
        `
      );
    } else {
      console.log("\nSKIP: invitationExpiresAt already exists.");
    }

    // =====================================
    // ADD INVITER USER ID
    // =====================================

    if (!(await columnExists("invitedByUserId"))) {
      await executeChange(
        "Add invitedByUserId column",
        `
          ALTER TABLE users
          ADD COLUMN invitedByUserId INT NULL
        `
      );
    } else {
      console.log("\nSKIP: invitedByUserId already exists.");
    }

    // =====================================
    // ADD INVITATION ACCEPTANCE TIMESTAMP
    // =====================================

    if (!(await columnExists("invitationAcceptedAt"))) {
      await executeChange(
        "Add invitationAcceptedAt column",
        `
          ALTER TABLE users
          ADD COLUMN invitationAcceptedAt DATETIME NULL
        `
      );
    } else {
      console.log("\nSKIP: invitationAcceptedAt already exists.");
    }

    // =====================================
    // ADD UNIQUE TOKEN HASH INDEX
    // =====================================

    const tokenIndexName = "uq_users_invitationTokenHash";

    if (!(await indexExists(tokenIndexName))) {
      await executeChange(
        "Add unique invitation token hash index",
        `
          ALTER TABLE users
          ADD UNIQUE INDEX ${tokenIndexName} (invitationTokenHash)
        `
      );
    } else {
      console.log("\nSKIP: invitation token hash index already exists.");
    }

    // =====================================
    // ADD INVITER INDEX
    // =====================================

    const inviterIndexName = "idx_users_invitedByUserId";

    if (!(await indexExists(inviterIndexName))) {
      await executeChange(
        "Add inviter user ID index",
        `
          ALTER TABLE users
          ADD INDEX ${inviterIndexName} (invitedByUserId)
        `
      );
    } else {
      console.log("\nSKIP: inviter index already exists.");
    }

    // =====================================
    // ADD SELF-REFERENCING FOREIGN KEY
    // =====================================

    const foreignKeyName = "fk_users_invitedByUser";

    if (!(await foreignKeyExists(foreignKeyName))) {
      await executeChange(
        "Add inviter foreign key",
        `
          ALTER TABLE users
          ADD CONSTRAINT ${foreignKeyName}
          FOREIGN KEY (invitedByUserId)
          REFERENCES users(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `
      );
    } else {
      console.log("\nSKIP: inviter foreign key already exists.");
    }

    // =====================================
    // VERIFY MIGRATION
    // =====================================

    if (APPLY) {
      console.log("\nVerifying invitation columns...");

      const requiredColumns = [
        "invitationTokenHash",
        "invitationExpiresAt",
        "invitedByUserId",
        "invitationAcceptedAt",
      ];

      for (const column of requiredColumns) {
        if (!(await columnExists(column))) {
          throw new Error(
            `Verification failed: ${column} was not found.`
          );
        }

        console.log(`VERIFIED: ${column}`);
      }

      if (!(await indexExists(tokenIndexName))) {
        throw new Error("Invitation token index verification failed.");
      }

      if (!(await indexExists(inviterIndexName))) {
        throw new Error("Inviter index verification failed.");
      }

      if (!(await foreignKeyExists(foreignKeyName))) {
        throw new Error("Inviter foreign key verification failed.");
      }

      console.log("\nAll invitation schema checks passed.");
    } else {
      console.log(
        "\nPREVIEW ONLY. No database changes were made."
      );
    }
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("\nInvitation migration stopped:", error.message);
  process.exitCode = 1;
});
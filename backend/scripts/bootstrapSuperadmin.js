
require("dotenv").config();

const bcrypt = require("bcryptjs");
const { sequelize, User } = require("../models");

// ======================================================
// CONSTANTS
// ======================================================

const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 12;
const BCRYPT_MAX_BYTES = 72;

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (email) =>
  email.trim().toLowerCase();

const validateNewAccountPassword = (password) => {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error(
      "SUPERADMIN_PASSWORD is required when creating a new account."
    );
  }

  if ([...password].length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `SUPERADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters long.`
    );
  }

  if (Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES) {
    throw new Error(
      `SUPERADMIN_PASSWORD must not exceed ${BCRYPT_MAX_BYTES} UTF-8 bytes.`
    );
  }
};

// ======================================================
// BOOTSTRAP SUPER ADMIN
// ======================================================

async function bootstrapSuperadmin() {
  const configuredEmail = process.env.SUPERADMIN_EMAIL;

  if (!configuredEmail || !configuredEmail.trim()) {
    throw new Error("SUPERADMIN_EMAIL must be set.");
  }

  const email = normalizeEmail(configuredEmail);

  await sequelize.authenticate();

  await sequelize.transaction(async (transaction) => {
    const existingUser = await User.findOne({
      where: { email },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // --------------------------------------------------
    // EXISTING ACCOUNT
    // --------------------------------------------------

    if (existingUser) {
      if (existingUser.role === "superadmin") {
        if (
          !existingUser.isActive ||
          existingUser.approvalStatus !== "approved" ||
          !existingUser.isEmailVerified
        ) {
          throw new Error(
            "The existing Super Admin account must be active, approved and email-verified. Review it manually."
          );
        }

        console.log(
          "The configured Super Admin account already exists and is ready."
        );

        return;
      }

      if (existingUser.role !== "admin") {
        throw new Error(
          "The configured email belongs to a non-admin account. No changes were made."
        );
      }

      if (
        !existingUser.isActive ||
        existingUser.approvalStatus !== "approved"
      ) {
        throw new Error(
          "The existing Admin account must be active and approved before promotion."
        );
      }

      if (!existingUser.isEmailVerified) {
        throw new Error(
          "The existing Admin account must have a verified email before promotion."
        );
      }

      existingUser.role = "superadmin";

      await existingUser.save({
        transaction,
      });

      console.log(
        "Existing approved and verified Admin promoted to Super Admin."
      );

      return;
    }

    // --------------------------------------------------
    // CREATE NEW SUPER ADMIN
    // --------------------------------------------------

    const password = process.env.SUPERADMIN_PASSWORD;

    validateNewAccountPassword(password);

    const firstName = (
      process.env.SUPERADMIN_FIRST_NAME || "System"
    ).trim();

    const lastName = (
      process.env.SUPERADMIN_LAST_NAME || "Admin"
    ).trim();

    if (!firstName || firstName.length > 50) {
      throw new Error(
        "SUPERADMIN_FIRST_NAME must be 1–50 characters."
      );
    }

    if (!lastName || lastName.length > 50) {
      throw new Error(
        "SUPERADMIN_LAST_NAME must be 1–50 characters."
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      BCRYPT_ROUNDS
    );

    await User.create(
      {
        firstName,
        lastName,
        email,
        password: passwordHash,

        role: "superadmin",
        requestedRole: null,

        isActive: true,
        approvalStatus: "approved",

        // A bootstrap-created Super Admin is explicitly
        // trusted as an operator-provisioned account.
        isEmailVerified: true,

        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
      {
        transaction,
      }
    );

    console.log("Super Admin account created successfully.");
  });
}

// ======================================================
// EXECUTION
// ======================================================

bootstrapSuperadmin()
  .catch((error) => {
    console.error(
      "Super Admin bootstrap failed:",
      error.message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      console.error(
        "Could not close the database connection:",
        error.message
      );

      process.exitCode = 1;
    }
  });

const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

// ======================================================
// DATABASE AND MODELS
// ======================================================

const sequelize = require("./config/database");

// Load Sequelize models and associations.
require("./models");

// ======================================================
// MIDDLEWARE
// ======================================================

const {
  errorMiddleware,
  notFoundMiddleware,
} = require("./middleware/errorMiddleware");

// ======================================================
// API ROUTES
// ======================================================

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");

const medicineRoutes = require("./routes/medicineRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const batchRoutes = require("./routes/batchRoutes");

const supplierRoutes = require("./routes/supplierRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");

const customerRoutes = require("./routes/customerRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");

const saleRoutes = require("./routes/saleRoutes");

const inventoryRoutes = require("./routes/inventoryRoutes");
const inventoryAlertRoutes = require("./routes/inventoryAlertRoutes");

const analyticsRoutes = require("./routes/analyticsRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const uploadRoutes = require("./routes/uploadRoutes");

// ======================================================
// APPLICATION CONFIGURATION
// ======================================================

const app = express();

// Hide Express technology information.
app.disable("x-powered-by");

// Trust one reverse proxy (Render's standard proxy setup).
app.set("trust proxy", 1);

// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as health checks.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },

    credentials: true,
  })
);

// ======================================================
// REQUEST PARSING
// ======================================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ======================================================
// STATIC FILES
// ======================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "PharmaCore API is running.",
  });
});

// ======================================================
// DATABASE CONNECTION MANAGEMENT
// ======================================================

let databaseConnectionPromise = null;

async function ensureDatabaseConnection() {
  if (!databaseConnectionPromise) {
    databaseConnectionPromise = sequelize
      .authenticate()
      .catch((error) => {
        // Allow a future request to retry if connection fails.
        databaseConnectionPromise = null;

        throw error;
      });
  }

  return databaseConnectionPromise;
}

// Check database connectivity before handling API requests.
app.use("/api", async (_req, res, next) => {
  try {
    await ensureDatabaseConnection();

    return next();
  } catch (error) {
    console.error(
      "PharmaCore database connection failed:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "The database is temporarily unavailable.",
    });
  }
});

// ======================================================
// API ROUTE REGISTRATION
// ======================================================

// Authentication and user management.
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Dashboard.
app.use("/api/dashboard", dashboardRoutes);

// Pharmacy catalogue.
app.use("/api/medicines", medicineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/batches", batchRoutes);

// Suppliers and purchasing.
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);

// Customers, doctors and prescriptions.
app.use("/api/customers", customerRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

// Sales.
app.use("/api/sales", saleRoutes);

// Inventory and alerts.
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory", inventoryAlertRoutes);

// Analytics and administration.
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/settings", settingsRoutes);

// File uploads.
app.use("/api/uploads", uploadRoutes);

// ======================================================
// 404 AND CENTRAL ERROR HANDLING
// ======================================================

// These must remain after all registered API routes.
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ======================================================
// SERVER STARTUP
// ======================================================

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 5000;

  async function startServer() {
    let server;

    try {
      // Establish database connectivity.
      await ensureDatabaseConnection();

      console.log(
        "Database connection established successfully."
      );

      // Production must use reviewed database migrations.
      if (process.env.NODE_ENV === "production") {
        if (process.env.RUN_SCHEMA_SYNC === "true") {
          throw new Error(
            "RUN_SCHEMA_SYNC is prohibited in production. " +
              "Use reviewed database migrations instead."
          );
        }
      } else {
        // Development synchronization only.
        await sequelize.sync();

        console.log(
          "Development database models synchronized successfully."
        );
      }

      // Start HTTP server.
      server = app.listen(PORT, () => {
        console.log(`PharmaCore API running on port ${PORT}.`);
      });

      // ==================================================
      // GRACEFUL SHUTDOWN
      // ==================================================

      let isShuttingDown = false;

      async function shutdown(signal) {
        if (isShuttingDown) {
          return;
        }

        isShuttingDown = true;

        console.log(`${signal} received. Shutting down...`);

        if (!server) {
          try {
            await sequelize.close();
          } catch (error) {
            console.error(
              "Database shutdown error:",
              error.message
            );

            process.exitCode = 1;
          }

          return;
        }

        server.close(async (error) => {
          try {
            await sequelize.close();

            if (error) {
              console.error(
                "HTTP server shutdown error:",
                error.message
              );

              process.exitCode = 1;
              return;
            }

            console.log(
              "PharmaCore server shut down successfully."
            );
          } catch (databaseError) {
            console.error(
              "Database shutdown error:",
              databaseError.message
            );

            process.exitCode = 1;
          }
        });
      }

      process.once("SIGTERM", () => shutdown("SIGTERM"));
      process.once("SIGINT", () => shutdown("SIGINT"));
    } catch (error) {
      console.error(
        "Failed to start PharmaCore API:",
        error.message
      );

      process.exitCode = 1;
    }
  }

  startServer();
}

// ======================================================
// EXPORT EXPRESS APPLICATION
// ======================================================

module.exports = app;
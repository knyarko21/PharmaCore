
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ======================================================
// Database and Models
// ======================================================

const sequelize = require("./config/database");

// Register all Sequelize models and associations.
require("./models");

// ======================================================
// Middleware
// ======================================================

const {
  errorMiddleware,
  notFoundMiddleware
} = require("./middleware/errorMiddleware");

// ======================================================
// API Routes
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
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const saleRoutes = require("./routes/saleRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const inventoryAlertRoutes = require("./routes/inventoryAlertRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

// ======================================================
// Application
// ======================================================

const app = express();

app.disable("x-powered-by");

// ======================================================
// CORS Configuration
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
      // Allow requests without an Origin header, such as
      // health checks and server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    },
    credentials: true
  })
);

// ======================================================
// Request Parsing
// ======================================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

// ======================================================
// Static Uploads
//
// Local filesystem uploads may not persist on Render's
// ephemeral filesystem. Use persistent object storage
// for files that must survive deployments or restarts.
// ======================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ======================================================
// Health Check
// ======================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PharmaCore API is running."
  });
});

// ======================================================
// Database Connection Management
// ======================================================

let databaseConnectionPromise = null;

const ensureDatabaseConnection = async () => {
  if (!databaseConnectionPromise) {
    databaseConnectionPromise = sequelize
      .authenticate()
      .catch((error) => {
        databaseConnectionPromise = null;
        throw error;
      });
  }

  return databaseConnectionPromise;
};

// Ensure the database is reachable before processing API
// requests. A failed connection can be retried later.
app.use("/api", async (req, res, next) => {
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
      message: "The database is temporarily unavailable."
    });
  }
});

// ======================================================
// API Route Registration
// ======================================================

// Authentication and account management
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Dashboard and core pharmacy operations
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/sales", saleRoutes);

// Inventory
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory", inventoryAlertRoutes);

// Reporting and administration
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/settings", settingsRoutes);

// Upload management
app.use("/api/uploads", uploadRoutes);

// ======================================================
// 404 and Central Error Handling
// ======================================================

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ======================================================
// Server Startup
//
// Render starts the server through the package start
// script. Vercel can import the Express app without
// executing this local-server startup block.
// ======================================================

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 5000;

  const startServer = async () => {
    try {
      await ensureDatabaseConnection();

      console.log(
        "Database connection established successfully."
      );

      // Optional, deliberate schema initialization.
      // Never enable this casually in production.
      if (process.env.RUN_SCHEMA_SYNC === "true") {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "RUN_SCHEMA_SYNC must not be enabled in production. " +
            "Use reviewed database migrations instead."
          );
        }

        console.warn(
          "RUN_SCHEMA_SYNC is enabled. Initializing missing tables..."
        );

        await sequelize.sync();

        console.log(
          "Database schema initialization completed."
        );
      }

      // Synchronize models only in local development.
      if (process.env.NODE_ENV !== "production") {
        await sequelize.sync();

        console.log(
          "Development database models synchronized successfully."
        );
      }

      const server = app.listen(PORT, () => {
        console.log(
          `PharmaCore API running on port ${PORT}.`
        );
      });

      // Graceful shutdown for local and hosted environments.
      const shutdown = (signal) => {
        console.log(`${signal} received. Shutting down...`);

        server.close(async (serverError) => {
          try {
            await sequelize.close();

            if (serverError) {
              console.error(
                "HTTP server shutdown error:",
                serverError.message
              );

              process.exitCode = 1;
            } else {
              console.log(
                "PharmaCore server shut down successfully."
              );
            }
          } catch (databaseError) {
            console.error(
              "Database shutdown error:",
              databaseError.message
            );

            process.exitCode = 1;
          }
        });
      };

      process.once("SIGTERM", () => shutdown("SIGTERM"));
      process.once("SIGINT", () => shutdown("SIGINT"));
    } catch (error) {
      console.error(
        "Failed to start PharmaCore API:",
        error.message
      );

      process.exitCode = 1;
    }
  };

  startServer();
}

// ======================================================
// Export Application
// ======================================================

module.exports = app;
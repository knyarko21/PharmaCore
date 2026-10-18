
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ======================================================
// Database and Models
// ======================================================

const sequelize = require("./config/database");

// Register all Sequelize models and their associations.
require("./models");

// ======================================================
// Error Middleware
// ======================================================

const {
  errorMiddleware,
  notFoundMiddleware,
} = require("./middleware/errorMiddleware");

// ======================================================
// API Routes
// ======================================================

const authRoutes = require("./routes/authRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const customerRoutes = require("./routes/customerRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const saleRoutes = require("./routes/saleRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const batchRoutes = require("./routes/batchRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const inventoryAlertRoutes = require("./routes/inventoryAlertRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

// ======================================================
// Initialize Express
// ======================================================

const app = express();

app.disable("x-powered-by");

// ======================================================
// CORS Configuration
// ======================================================

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as
      // health checks and certain server-to-server requests.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS.")
      );
    },
    credentials: true,
  })
);

// ======================================================
// Request Parsing
// ======================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ======================================================
// Static Uploaded Files
//
// Local uploads are not persistent on ephemeral hosting.
// Use persistent object storage for production uploads.
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
    message: "PharmaCore API is running.",
  });
});

// ======================================================
// Database Connection
//
// Reuse a connection check across requests handled by
// this Node.js process. Failed checks can be retried.
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
      message: "The database is temporarily unavailable.",
    });
  }
});

// ======================================================
// API Routes
// ======================================================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory", inventoryAlertRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/uploads", uploadRoutes);

// ======================================================
// 404 and Error Handling
// ======================================================

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ======================================================
// Local and Render Server Startup
//
// Render starts this file through "npm start".
// Vercel can import the Express app without running
// this startup block.
// ======================================================

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 5000;

  const startServer = async () => {
    try {
      await sequelize.authenticate();

      console.log(
        "Database connection established successfully."
      );

      // --------------------------------------------------
      // Controlled Production Schema Initialization
      //
      // Enable RUN_SCHEMA_SYNC=true only for a deliberate,
      // one-time initialization of missing tables.
      //
      // Plain sync() does not intentionally drop existing
      // tables or alter existing table definitions.
      // --------------------------------------------------

      if (process.env.RUN_SCHEMA_SYNC === "true") {
        console.warn(
          "RUN_SCHEMA_SYNC is enabled. Initializing missing tables..."
        );

        await sequelize.sync();

        console.log(
          "Production schema initialization completed successfully."
        );
      }

      // --------------------------------------------------
      // Local Development Synchronization
      // --------------------------------------------------

      if (process.env.NODE_ENV !== "production") {
        await sequelize.sync();

        console.log(
          "Development database models synchronized successfully."
        );
      }

      // --------------------------------------------------
      // Start HTTP Server
      // --------------------------------------------------

      app.listen(PORT, () => {
        console.log(
          `PharmaCore API running on port ${PORT}.`
        );
      });
    } catch (error) {
      console.error(
        "Failed to start PharmaCore API:",
        error.message
      );

      // Do not run with an uninitialized database.
      process.exitCode = 1;
    }
  };

  startServer();
}

// ======================================================
// Export Express Application
// ======================================================

module.exports = app;
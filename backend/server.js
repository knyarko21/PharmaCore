
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ======================================================
// Database and Models
// ======================================================

const sequelize = require("./config/database");

// Register models and associations.
require("./models");

// ======================================================
// Error Middleware
// ======================================================

const {
  errorMiddleware,
  notFoundMiddleware
} = require("./middleware/errorMiddleware");

// ======================================================
// Routes
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

// ======================================================
// Global Middleware
// ======================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// Static Uploaded Files
// Note: Vercel's filesystem is not persistent storage.
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
// Database Connection for Serverless Requests
// ======================================================

let databaseConnectionPromise = null;

const ensureDatabaseConnection = async () => {
  if (!databaseConnectionPromise) {
    databaseConnectionPromise = sequelize.authenticate().catch((error) => {
      // Allow a later request to retry if the connection fails.
      databaseConnectionPromise = null;
      throw error;
    });
  }

  return databaseConnectionPromise;
};

app.use("/api", async (req, res, next) => {
  try {
    await ensureDatabaseConnection();
    next();
  } catch (error) {
    console.error(
      "PharmaCore database connection failed:",
      error.message
    );

    res.status(503).json({
      success: false,
      message: "The database is temporarily unavailable."
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
// Local Development Server
//
// Vercel imports the Express app instead of relying on
// this local startup block.
// ======================================================

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 5000;

  const startServer = async () => {
    try {
      await sequelize.authenticate();

      console.log(
        "Database connection established successfully."
      );

      // Local development only.
      // Do not automatically synchronize production tables.
      if (process.env.NODE_ENV !== "production") {
        await sequelize.sync();

        console.log(
          "Database models synchronized successfully."
        );
      }

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

      process.exitCode = 1;
    }
  };

  startServer();
}

// Export the Express application for Vercel.
module.exports = app;
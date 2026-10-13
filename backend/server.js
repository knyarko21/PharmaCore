
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ======================================================
// Database
// ======================================================

const sequelize = require("./config/database");

// Load models and register all associations.
require("./models");

// ======================================================
// Middleware
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
// Static file serving for uploaded images
// ======================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ======================================================
// Health Check
// ======================================================

app.get("/", (req, res) =>
  res.status(200).json({
    success: true,
    message: "PharmaCore API is running."
  })
);

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
// 404 + Error Handling
// ======================================================

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ======================================================
// Start Server
// ======================================================

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await sequelize.sync();
    console.log("Database models synchronized successfully.");

    app.listen(PORT, () => {
      console.log(`PharmaCore API running on port ${PORT}.`);
    });
  } catch (error) {
    console.error("Failed to start PharmaCore API:", error.message);
    process.exitCode = 1;
  }
};

startServer();

module.exports = app;
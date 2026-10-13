
const customerService = require("../services/customerService");

// ======================================================
// Helpers
// ======================================================

const logError = (context, error) => {
  console.error("=================================");
  console.error(context);
  console.error(error);
  console.error("=================================");
};

const sendError = (res, error, fallbackMessage) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage
  });

// ======================================================
// Create Customer
// POST /api/customers
// ======================================================

const createCustomer = async (req, res) => {
  try {
    const customer = await customerService.createCustomer(req.body);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer
    });
  } catch (error) {
    logError("Create customer error:", error);

    return sendError(res, error, "Unable to create customer.");
  }
};

// ======================================================
// Get All Customers
// GET /api/customers
// ======================================================

const getAllCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    logError("Get customers error:", error);

    return sendError(res, error, "Unable to fetch customers.");
  }
};

// ======================================================
// Get Customer By ID
// GET /api/customers/:id
// ======================================================

const getCustomerById = async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);

    return res.status(200).json({
      success: true,
      customer
    });
  } catch (error) {
    logError("Get customer error:", error);

    return sendError(res, error, "Unable to fetch customer.");
  }
};

// ======================================================
// Update Customer
// PUT /api/customers/:id
// ======================================================

const updateCustomer = async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      customer
    });
  } catch (error) {
    logError("Update customer error:", error);

    return sendError(res, error, "Unable to update customer.");
  }
};

// ======================================================
// Deactivate Customer
// DELETE /api/customers/:id
// ======================================================

const deactivateCustomer = async (req, res) => {
  try {
    await customerService.deactivateCustomer(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully."
    });
  } catch (error) {
    logError("Deactivate customer error:", error);

    return sendError(res, error, "Unable to deactivate customer.");
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deactivateCustomer
};
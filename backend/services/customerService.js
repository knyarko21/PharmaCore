
const { Customer } = require("../models");

// ======================================================
// Helpers
// ======================================================

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertEmailAvailable = async (email, excludeId = null) => {
  if (!email) return;

  const existing = await Customer.findOne({ where: { email } });

  if (existing && existing.id !== excludeId) {
    throw createHttpError(
      "A customer with this email already exists.",
      409
    );
  }
};

// ======================================================
// Create Customer
// ======================================================

const createCustomer = async (data) => {
  await assertEmailAvailable(data.email);

  return Customer.create(data);
};

// ======================================================
// Get All Customers
// ======================================================

const getAllCustomers = async () =>
  Customer.findAll({
    where: { isActive: true },
    order: [["createdAt", "DESC"]]
  });

// ======================================================
// Get Customer By ID
// ======================================================

const getCustomerById = async (id) => {
  const customer = await Customer.findByPk(id);

  if (!customer) {
    throw createHttpError("Customer not found.", 404);
  }

  return customer;
};

// ======================================================
// Update Customer
// ======================================================

const updateCustomer = async (id, data) => {
  const customer = await Customer.findByPk(id);

  if (!customer) {
    throw createHttpError("Customer not found.", 404);
  }

  if (data.email && data.email !== customer.email) {
    await assertEmailAvailable(data.email, customer.id);
  }

  await customer.update(data);

  return customer;
};

// ======================================================
// Deactivate Customer
// ======================================================

const deactivateCustomer = async (id) => {
  const customer = await Customer.findByPk(id);

  if (!customer) {
    throw createHttpError("Customer not found.", 404);
  }

  if (!customer.isActive) {
    throw createHttpError("This customer is already inactive.", 400);
  }

  await customer.update({ isActive: false });

  return customer;
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deactivateCustomer
};
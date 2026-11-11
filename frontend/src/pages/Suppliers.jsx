
// ===============================================
// Supplier Role Permissions
// ===============================================

// Roles allowed to create new suppliers.
// Cashiers can add suppliers.
const canCreate = hasRolePermission([
  "admin",
  "pharmacist",
  "cashier",
  "inventory_manager",
  "procurement",
]);

// Roles allowed to edit existing suppliers.
// Cashiers are intentionally excluded.
const canManage = hasRolePermission([
  "admin",
  "pharmacist",
  "inventory_manager",
  "procurement",
]);

// Only Admin and Inventory Manager can deactivate suppliers.
const canDeactivate = hasRolePermission([
  "admin",
  "inventory_manager",
]);
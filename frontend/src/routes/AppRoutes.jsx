
import { lazy, Suspense, useEffect } from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

// ======================================================
// ROLE CONFIGURATION
// ======================================================

const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
  INVENTORY_MANAGER: "inventory_manager",
  PROCUREMENT: "procurement",
};

const ALL_ROLES = Object.values(ROLES);

const SUPERADMIN_ONLY = [
  ROLES.SUPERADMIN,
];

const USER_APPROVAL_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
];

const STAFF_MANAGEMENT_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
];

const ADMIN_ONLY = [
  ROLES.ADMIN,
];

const SALES_ROLES = [
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.PHARMACIST,
];

const PHARMACY_ROLES = [
  ROLES.ADMIN,
  ROLES.PHARMACIST,
];


const PURCHASE_ROLES = [
  ROLES.ADMIN,
  ROLES.PHARMACIST,
  ROLES.INVENTORY_MANAGER,
  ROLES.PROCUREMENT,
  ROLES.CASHIER,
];

const ANALYTICS_ROLES = [
  ROLES.ADMIN,
  ROLES.PHARMACIST,
  ROLES.INVENTORY_MANAGER,
  ROLES.CASHIER,
];

// ======================================================
// ROLE NORMALIZATION
// ======================================================

const normalizeRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

// ======================================================
// ROLE HIERARCHY
// ======================================================

const ROLE_HIERARCHY = {
  [ROLES.SUPERADMIN]: [
    ROLES.SUPERADMIN,
    ROLES.ADMIN,
  ],

  [ROLES.ADMIN]: [
    ROLES.ADMIN,
  ],

  [ROLES.PHARMACIST]: [
    ROLES.PHARMACIST,
  ],

  [ROLES.CASHIER]: [
    ROLES.CASHIER,
  ],

  [ROLES.INVENTORY_MANAGER]: [
    ROLES.INVENTORY_MANAGER,
  ],

  [ROLES.PROCUREMENT]: [
    ROLES.PROCUREMENT,
  ],
};

const hasRolePermission = (userRole, allowedRoles) => {
  const normalizedUserRole = normalizeRole(userRole);

  const normalizedAllowedRoles = allowedRoles.map(
    normalizeRole
  );

  const inheritedRoles =
    ROLE_HIERARCHY[normalizedUserRole] || [];

  return normalizedAllowedRoles.some((role) =>
    inheritedRoles.includes(role)
  );
};

// ======================================================
// LAZY-LOADED AUTHENTICATION PAGES
// ======================================================

const Login = lazy(() => import("../pages/Login"));

const SignUp = lazy(() => import("../pages/SignUp"));

const AcceptInvitation = lazy(
  () => import("../pages/AcceptInvitation")
);

const SetupAdminPassword = lazy(
  () => import("../pages/SetupAdminPassword")
);

// ======================================================
// LAZY-LOADED APPLICATION PAGES
// ======================================================

const Dashboard = lazy(() => import("../pages/Dashboard"));

const Medicines = lazy(() => import("../pages/Medicines"));

const Inventory = lazy(() => import("../pages/Inventory"));

const Purchases = lazy(() => import("../pages/Purchases"));

const CreatePurchase = lazy(
  () => import("../pages/CreatePurchase")
);

const PurchaseDetails = lazy(
  () => import("../pages/PurchaseDetails")
);

const ReceivePurchase = lazy(
  () => import("../pages/ReceivePurchase")
);

const Suppliers = lazy(() => import("../pages/Suppliers"));

const Sales = lazy(() => import("../pages/Sales"));

const Customers = lazy(() => import("../pages/Customers"));

const Doctors = lazy(() => import("../pages/Doctors"));

const Prescriptions = lazy(
  () => import("../pages/Prescriptions")
);

const Analytics = lazy(() => import("../pages/Analytics"));

const AuditLogs = lazy(() => import("../pages/AuditLogs"));

const Settings = lazy(() => import("../pages/Settings"));

const UserApprovals = lazy(
  () => import("../pages/UserApprovals")
);

const StaffManagement = lazy(
  () => import("../pages/StaffManagement")
);

const AdminManagement = lazy(
  () => import("../pages/AdminManagement")
);

const Unauthorized = lazy(
  () => import("../pages/Unauthorized")
);

// ======================================================
// PAGE LOADING FALLBACK
// ======================================================

const PageLoader = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-[#08080a] px-6"
    role="status"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500" />

        <div className="h-3 w-3 rounded-full bg-fuchsia-500 shadow-lg shadow-fuchsia-500/40" />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-200">
          Loading PharmaCore
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          Preparing your workspace...
        </p>
      </div>
    </div>
  </div>
);

// ======================================================
// SCROLL RESTORATION
// ======================================================

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
};

// ======================================================
// ROLE-PROTECTED ROUTE
// ======================================================

const RoleProtectedRoute = ({
  allowedRoles = ALL_ROLES,
  children,
}) => {
  const { user } = useAuth();

  const userRole = normalizeRole(user?.role);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRolePermission(userRole, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// ======================================================
// REUSABLE PROTECTED PAGE
// ======================================================

const ProtectedPage = ({
  allowedRoles = ALL_ROLES,
  children,
}) => (
  <RoleProtectedRoute allowedRoles={allowedRoles}>
    {children}
  </RoleProtectedRoute>
);

// ======================================================
// APPLICATION ROUTES
// ======================================================

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* DEFAULT ROUTE */}

          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* PUBLIC AUTHENTICATION ROUTES */}

          <Route
            path="/login"
            element={<Login />}
          />

          {/* Temporarily retained for legacy registrations. */}

          <Route
            path="/signup"
            element={<SignUp />}
          />

          {/* New invitation acceptance route. */}

          <Route
            path="/accept-invitation"
            element={<AcceptInvitation />}
          />

          {/* Legacy Admin password setup route. */}

          <Route
            path="/setup-admin-password"
            element={<SetupAdminPassword />}
          />

          {/* AUTHENTICATED APPLICATION */}

          <Route element={<ProtectedRoute />}>
            {/* UNAUTHORIZED PAGE */}

            <Route
              path="/unauthorized"
              element={<Unauthorized />}
            />

            {/* MAIN APPLICATION LAYOUT */}

            <Route element={<MainLayout />}>
              {/* DASHBOARD */}

              <Route
                path="/dashboard"
                element={
                  <ProtectedPage>
                    <Dashboard />
                  </ProtectedPage>
                }
              />

              {/* MEDICINES */}

              <Route
                path="/medicines"
                element={
                  <ProtectedPage>
                    <Medicines />
                  </ProtectedPage>
                }
              />

              {/* INVENTORY */}

              <Route
                path="/inventory"
                element={
                  <ProtectedPage>
                    <Inventory />
                  </ProtectedPage>
                }
              />

              {/* PURCHASE LISTING */}

              <Route
                path="/purchases"
                element={
                  <ProtectedPage>
                    <Purchases />
                  </ProtectedPage>
                }
              />

              {/* PURCHASE DETAILS */}

              <Route
                path="/purchases/:id"
                element={
                  <ProtectedPage>
                    <PurchaseDetails />
                  </ProtectedPage>
                }
              />

              {/* CREATE PURCHASES */}

              <Route
                path="/purchases/create"
                element={
                  <ProtectedPage allowedRoles={PURCHASE_ROLES}>
                    <CreatePurchase />
                  </ProtectedPage>
                }
              />

              {/* RECEIVE PURCHASES */}

              <Route
                path="/purchases/:id/receive"
                element={
                  <ProtectedPage allowedRoles={PURCHASE_ROLES}>
                    <ReceivePurchase />
                  </ProtectedPage>
                }
              />

              {/* SUPPLIERS */}

              <Route
                path="/suppliers"
                element={
                  <ProtectedPage>
                    <Suppliers />
                  </ProtectedPage>
                }
              />

              {/* SALES */}

              <Route
                path="/sales"
                element={
                  <ProtectedPage allowedRoles={SALES_ROLES}>
                    <Sales />
                  </ProtectedPage>
                }
              />

              {/* CUSTOMERS */}

              <Route
                path="/customers"
                element={
                  <ProtectedPage allowedRoles={SALES_ROLES}>
                    <Customers />
                  </ProtectedPage>
                }
              />

              {/* DOCTORS */}

              <Route
                path="/doctors"
                element={
                  <ProtectedPage allowedRoles={PHARMACY_ROLES}>
                    <Doctors />
                  </ProtectedPage>
                }
              />

              {/* PRESCRIPTIONS */}

              <Route
                path="/prescriptions"
                element={
                  <ProtectedPage allowedRoles={PHARMACY_ROLES}>
                    <Prescriptions />
                  </ProtectedPage>
                }
              />

              {/* ANALYTICS */}

              <Route
                path="/analytics"
                element={
                  <ProtectedPage allowedRoles={ANALYTICS_ROLES}>
                    <Analytics />
                  </ProtectedPage>
                }
              />

              {/* STAFF MANAGEMENT — ADMIN AND SUPER ADMIN */}

              <Route
                path="/staff-management"
                element={
                  <ProtectedPage
                    allowedRoles={STAFF_MANAGEMENT_ROLES}
                  >
                    <StaffManagement />
                  </ProtectedPage>
                }
              />

              {/* LEGACY USER APPROVALS */}

              <Route
                path="/user-approvals"
                element={
                  <ProtectedPage
                    allowedRoles={USER_APPROVAL_ROLES}
                  >
                    <UserApprovals />
                  </ProtectedPage>
                }
              />

              {/* ADMIN MANAGEMENT — SUPER ADMIN ONLY */}

              <Route
                path="/admin-management"
                element={
                  <ProtectedPage allowedRoles={SUPERADMIN_ONLY}>
                    <AdminManagement />
                  </ProtectedPage>
                }
              />

              {/* AUDIT LOGS */}

              <Route
                path="/audit-logs"
                element={
                  <ProtectedPage allowedRoles={ADMIN_ONLY}>
                    <AuditLogs />
                  </ProtectedPage>
                }
              />

              {/* SETTINGS */}

              <Route
                path="/settings"
                element={
                  <ProtectedPage allowedRoles={ADMIN_ONLY}>
                    <Settings />
                  </ProtectedPage>
                }
              />
            </Route>
          </Route>

          {/* UNKNOWN URLS */}

          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </Suspense>
    </>
  );
};

export default AppRoutes;
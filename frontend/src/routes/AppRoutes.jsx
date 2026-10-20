
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
// Role Configuration
// ======================================================

const ROLES = {
  ADMIN: "admin",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
  INVENTORY_MANAGER: "inventory_manager",
  PROCUREMENT: "procurement",
};

const ALL_ROLES = Object.values(ROLES);

const ADMIN_ONLY = [ROLES.ADMIN];

const SALES_ROLES = [
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.PHARMACIST,
];

const PHARMACY_ROLES = [
  ROLES.ADMIN,
  ROLES.PHARMACIST,
];

const INVENTORY_ROLES = [
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
  ROLES.PROCUREMENT,
];

const ANALYTICS_ROLES = [
  ROLES.ADMIN,
  ROLES.PHARMACIST,
  ROLES.INVENTORY_MANAGER,
];

// ======================================================
// Role Normalization
// ======================================================

const normalizeRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

// ======================================================
// Lazy-loaded Authentication Pages
// ======================================================

const Login = lazy(() => import("../pages/Login"));
const SignUp = lazy(() => import("../pages/SignUp"));

// ======================================================
// Lazy-loaded Application Pages
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

const Prescriptions = lazy(
  () => import("../pages/Prescriptions")
);

const Analytics = lazy(() => import("../pages/Analytics"));
const AuditLogs = lazy(() => import("../pages/AuditLogs"));
const Settings = lazy(() => import("../pages/Settings"));

const UserApprovals = lazy(
  () => import("../pages/UserApprovals")
);

// ======================================================
// Page Loading Fallback
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
// Scroll Restoration
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
// Role-Protected Route
// ======================================================

const RoleProtectedRoute = ({
  allowedRoles = ALL_ROLES,
  children,
}) => {
  const { user } = useAuth();

  const userRole = normalizeRole(user?.role);
  const permittedRoles = allowedRoles.map(normalizeRole);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!permittedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ======================================================
// Reusable Protected Page
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
// Application Routes
// ======================================================

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Default route */}

          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* Public authentication routes */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<SignUp />}
          />

          {/* Authenticated application */}

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Dashboard */}

              <Route
                path="/dashboard"
                element={
                  <ProtectedPage>
                    <Dashboard />
                  </ProtectedPage>
                }
              />

              {/* Medicines */}

              <Route
                path="/medicines"
                element={
                  <ProtectedPage>
                    <Medicines />
                  </ProtectedPage>
                }
              />

              {/* Inventory */}

              <Route
                path="/inventory"
                element={
                  <ProtectedPage>
                    <Inventory />
                  </ProtectedPage>
                }
              />

              {/* Purchase listing and details */}

              <Route
                path="/purchases"
                element={
                  <ProtectedPage>
                    <Purchases />
                  </ProtectedPage>
                }
              />

              <Route
                path="/purchases/:id"
                element={
                  <ProtectedPage>
                    <PurchaseDetails />
                  </ProtectedPage>
                }
              />

              {/* Create purchases */}

              <Route
                path="/purchases/create"
                element={
                  <ProtectedPage
                    allowedRoles={INVENTORY_ROLES}
                  >
                    <CreatePurchase />
                  </ProtectedPage>
                }
              />

              {/* Receive purchases */}

              <Route
                path="/purchases/:id/receive"
                element={
                  <ProtectedPage
                    allowedRoles={INVENTORY_ROLES}
                  >
                    <ReceivePurchase />
                  </ProtectedPage>
                }
              />

              {/* Suppliers */}

              <Route
                path="/suppliers"
                element={
                  <ProtectedPage>
                    <Suppliers />
                  </ProtectedPage>
                }
              />

              {/* Sales */}

              <Route
                path="/sales"
                element={
                  <ProtectedPage allowedRoles={SALES_ROLES}>
                    <Sales />
                  </ProtectedPage>
                }
              />

              {/* Customers */}

              <Route
                path="/customers"
                element={
                  <ProtectedPage allowedRoles={SALES_ROLES}>
                    <Customers />
                  </ProtectedPage>
                }
              />

              {/* Prescriptions */}

              <Route
                path="/prescriptions"
                element={
                  <ProtectedPage
                    allowedRoles={PHARMACY_ROLES}
                  >
                    <Prescriptions />
                  </ProtectedPage>
                }
              />

              {/* Analytics */}

              <Route
                path="/analytics"
                element={
                  <ProtectedPage
                    allowedRoles={ANALYTICS_ROLES}
                  >
                    <Analytics />
                  </ProtectedPage>
                }
              />

              {/* Admin-only: user registration approvals */}

              <Route
                path="/user-approvals"
                element={
                  <ProtectedPage allowedRoles={ADMIN_ONLY}>
                    <UserApprovals />
                  </ProtectedPage>
                }
              />

              {/* Admin-only: audit logs */}

              <Route
                path="/audit-logs"
                element={
                  <ProtectedPage allowedRoles={ADMIN_ONLY}>
                    <AuditLogs />
                  </ProtectedPage>
                }
              />

              {/* Admin-only: settings */}

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

          {/* Unknown URLs */}

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

import {
  lazy,
  Suspense,
  useEffect,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";

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
// App Routes
// ======================================================

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ================================================
              Default Route: Always Open Login
          ================================================= */}

          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* ================================================
              Public Authentication Routes
          ================================================= */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<SignUp />}
          />

          {/* ================================================
              Protected Application Routes
          ================================================= */}

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/medicines"
                element={<Medicines />}
              />

              <Route
                path="/inventory"
                element={<Inventory />}
              />

              <Route
                path="/purchases"
                element={<Purchases />}
              />

              <Route
                path="/purchases/create"
                element={<CreatePurchase />}
              />

              <Route
                path="/purchases/:id/receive"
                element={<ReceivePurchase />}
              />

              <Route
                path="/purchases/:id"
                element={<PurchaseDetails />}
              />

              <Route
                path="/suppliers"
                element={<Suppliers />}
              />

              <Route
                path="/sales"
                element={<Sales />}
              />

              <Route
                path="/customers"
                element={<Customers />}
              />

              <Route
                path="/prescriptions"
                element={<Prescriptions />}
              />

              <Route
                path="/analytics"
                element={<Analytics />}
              />

              <Route
                path="/audit-logs"
                element={<AuditLogs />}
              />

              <Route
                path="/settings"
                element={<Settings />}
              />
            </Route>
          </Route>

          {/* ================================================
              Unknown URLs
          ================================================= */}

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
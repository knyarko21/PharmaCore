
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

// ======================================================
// Root mount
// ======================================================
//
// Provider hierarchy:
//
//   StrictMode           — dev-only double-invoke checks
//   BrowserRouter        — routing context (must be inside nothing)
//   AuthProvider         — session + user context
//   App                  — ErrorBoundary + AppRoutes
//
// AuthProvider sits *inside* BrowserRouter because it does not
// use router hooks itself. If it ever needs useNavigate or
// useLocation, it must remain inside BrowserRouter.
//
// App wraps its own ErrorBoundary, so runtime failures
// inside any page are caught without unmounting the router.
// ======================================================

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    "PharmaCore: failed to mount. #root element was not found in index.html."
  );
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
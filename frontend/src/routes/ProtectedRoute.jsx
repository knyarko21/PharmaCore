
import {
  Navigate,
  Outlet,
  useLocation
} from "react-router-dom";

import { ShieldCheck } from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ======================================================
// Protected Route
// ======================================================

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  const location = useLocation();

  // ====================================================
  // Auth loading state
  // ====================================================

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] text-white">
        {/* Ambient background orbs */}

        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
          <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
          <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <ShieldCheck size={28} className="text-violet-400" />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading PharmaCore
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Verifying your session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // Not authenticated
  // ====================================================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location
        }}
      />
    );
  }

  // ====================================================
  // Authenticated
  // ====================================================

  return <Outlet />;
};

export default ProtectedRoute;
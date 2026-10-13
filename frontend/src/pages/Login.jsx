
import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Pill,
  ShieldCheck,
  Mail,
  ArrowRight,
  Sparkles,
  Activity,
  Users,
  Package,
  Shield,
} from "lucide-react";

import { useState } from "react";

import {
  Navigate,
  useNavigate,
  Link,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

// ======================================================
// Feature Card
// ======================================================

const FeatureCard = ({ icon: Icon, title, subtitle }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.06]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/20">
          <Icon size={19} aria-hidden="true" />
        </div>

        <p className="text-lg font-bold text-white">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

// ======================================================
// Error Message Helper
// ======================================================

const getLoginErrorMessage = (error) => {
  const status = error?.response?.status;

  if (!error?.response) {
    return "Unable to connect to the server. Check your connection and try again.";
  }

  if (status === 400 || status === 401) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Invalid email or password. Please try again."
    );
  }

  if (status === 403) {
    return (
      error.response?.data?.message ||
      "You are not authorized to access this account."
    );
  }

  if (status >= 500) {
    return "The server encountered an error. Please try again shortly.";
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Unable to sign in. Please try again."
  );
};

// ======================================================
// Login Page
// ======================================================

const Login = () => {
  const navigate = useNavigate();

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect authenticated users.
  // Keep this before the returned login UI.

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // ====================================================
  // Handle Login
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    try {
      setLoading(true);

      await login(normalizedEmail, password);

      // AuthContext is responsible for updating the
      // authenticated user and authentication state.

      navigate("/dashboard", {
        replace: true,
      });
    } catch (loginError) {
      console.error(
        "PharmaCore login failed:",
        loginError
      );

      setError(getLoginErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080a] text-white">
      {/* Ambient Background */}

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-600/[0.12] blur-[140px]" />

        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-fuchsia-600/[0.08] blur-[140px]" />

        <div className="absolute left-1/3 top-1/2 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ================================================
            LEFT BRAND PANEL
        ================================================= */}

        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-[#08080a] to-fuchsia-950/60" />

          {/* Grid Overlay */}

          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />

          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[100px]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Brand */}

            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-600/40">
                <Pill
                  size={25}
                  className="text-white"
                  aria-hidden="true"
                />

                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  PharmaCore
                </h1>

                <p className="text-sm text-slate-400">
                  Pharmacy Management
                </p>
              </div>
            </div>

            {/* Main Message */}

            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 backdrop-blur-sm">
                <ShieldCheck size={16} aria-hidden="true" />

                Secure Pharmacy Operations
              </div>

              <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                Manage your pharmacy{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                  with confidence.
                </span>
              </h2>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                Manage medicines, inventory, purchases,
                prescriptions, customers and sales from one
                secure platform.
              </p>

              {/* Features */}

              <div className="mt-10 grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={Activity}
                  title="Real-time"
                  subtitle="Inventory visibility"
                />

                <FeatureCard
                  icon={Shield}
                  title="Secure"
                  subtitle="Role-based access"
                />
              </div>

              {/* Trust Indicators */}

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />

                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>

                  Systems operational
                </span>

                <span className="inline-flex items-center gap-2">
                  <Users
                    size={14}
                    className="text-violet-400"
                    aria-hidden="true"
                  />

                  Trusted by pharmacy teams
                </span>

                <span className="inline-flex items-center gap-2">
                  <Package
                    size={14}
                    className="text-fuchsia-400"
                    aria-hidden="true"
                  />

                  Complete stock control
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              PharmaCore &bull; Pharmacy Management System
            </p>
          </div>
        </div>

        {/* ================================================
            LOGIN PANEL
        ================================================= */}

        <div className="relative flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Mobile Brand */}

            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/30">
                <Pill
                  size={23}
                  className="text-white"
                  aria-hidden="true"
                />

                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
              </div>

              <div>
                <h1 className="font-bold tracking-tight">
                  PharmaCore
                </h1>

                <p className="text-xs text-slate-500">
                  Pharmacy Management
                </p>
              </div>
            </div>

            {/* Heading */}

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                <Sparkles size={13} aria-hidden="true" />

                Welcome back
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sign in to your workspace
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Access your pharmacy dashboard, inventory and
                sales.
              </p>
            </div>

            {/* Error Message */}

            {error && (
              <div
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.1] to-transparent p-4 text-sm text-red-300 backdrop-blur-sm"
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />

                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {/* Email */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="you@example.com"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "login-error" : undefined
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "login-error" : undefined
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((previous) => !previous);
                    }}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {loading ? (
                  <>
                    <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    <span className="relative">
                      Signing in...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative">
                      Sign in
                    </span>

                    <ArrowRight
                      size={18}
                      className="relative transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{" "}

                <Link
                  to="/signup"
                  className="font-semibold text-violet-400 underline-offset-4 transition-colors hover:text-violet-300 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  Sign up
                </Link>
              </p>
            </div>

            {/* Footer */}

            <div className="mt-8 flex items-center gap-3 text-xs text-slate-600">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <ShieldCheck
                  size={13}
                  className="text-emerald-500/70"
                  aria-hidden="true"
                />

                Authorized pharmacy personnel only
              </span>

              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
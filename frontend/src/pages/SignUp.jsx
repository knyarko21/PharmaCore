
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Pill,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus
} from "lucide-react";

import { useState } from "react";

import {
  Link,
  Navigate,
  useNavigate
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ======================================================
// Sign Up
// ======================================================

const SignUp = () => {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  // ====================================================
  // Form State
  // ====================================================

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ====================================================
  // Redirect Authenticated Users
  // ====================================================

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // ====================================================
  // Handle Input Changes
  // ====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // ====================================================
  // Validate Form
  // ====================================================

  const validateForm = () => {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword
    } = formData;

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      return "Please complete all required fields.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (password.length < 8) {
      return "Your password must contain at least 8 characters.";
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Your password must contain at least one letter and one number.";
    }

    if (password !== confirmPassword) {
      return "Your passwords do not match.";
    }

    return "";
  };

  // ====================================================
  // Submit Registration
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Registration could not be completed."
        );
      }

      setSuccess(
        response.data?.message ||
          "Your account has been created successfully."
      );

      // Registration does not automatically log the user in.
      // The user must authenticate through the existing login flow.

      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess:
            response.data?.message ||
            "Account created successfully. You can now sign in.",
          registeredEmail: formData.email.trim().toLowerCase()
        }
      });
    } catch (error) {
      console.error("Registration error:", error);

      const status = error.response?.status;

      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to create your account. Please try again.";

      if (status === 409) {
        setError(
          "An account with this email may already exist. Please sign in or use another email."
        );
      } else if (status === 400 || status === 422) {
        setError(message);
      } else if (!error.response) {
        setError(
          "Unable to reach the server. Check that the PharmaCore backend is running."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // Reusable Input Styling
  // ====================================================

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-300";

  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080a] text-white">
      {/* Background Effects */}

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-600/[0.12] blur-[140px]" />

        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-fuchsia-600/[0.09] blur-[140px]" />

        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/[0.04] blur-[120px]" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ==================================================
            LEFT BRAND PANEL
        ================================================== */}

        <div className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-[#08080a] to-fuchsia-950/60" />

          {/* Grid Overlay */}

          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px"
            }}
          />

          <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />

          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[100px]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            {/* Brand */}

            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-600/40">
                <Pill size={25} className="text-white" />

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
                <Sparkles size={16} />

                Smarter Pharmacy Management
              </div>

              <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                Everything your pharmacy needs,{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                  in one place.
                </span>
              </h2>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                Bring medicines, inventory, suppliers, purchases,
                prescriptions and sales together in one organized
                workspace.
              </p>

              {/* Features */}

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/20">
                    <ShieldCheck size={21} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Controlled access
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Protect pharmacy operations with backend-managed
                      account permissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-500/20">
                    <UserPlus size={21} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Simple account setup
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Register with your details and sign in to your
                      authorized workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              PharmaCore • Pharmacy Management System
            </p>
          </div>
        </div>

        {/* ==================================================
            REGISTRATION PANEL
        ================================================== */}

        <div className="relative flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {/* Mobile Brand */}

            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/30">
                <Pill size={23} className="text-white" />

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

            <div className="mb-7">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                <Sparkles size={13} />

                Create your account
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Join PharmaCore
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your details to create your account and get
                started.
              </p>
            </div>

            {/* Error Message */}

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-300"
              >
                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}

            {success && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-sm text-emerald-300"
              >
                <CheckCircle2
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span>{success}</span>
              </div>
            )}

            {/* Registration Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* First Name and Last Name */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className={labelClass}
                  >
                    First name
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      autoComplete="given-name"
                      maxLength={100}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className={labelClass}
                  >
                    Last name
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      autoComplete="family-name"
                      maxLength={100}
                      required
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}

              <div>
                <label
                  htmlFor="email"
                  className={labelClass}
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="password"
                  className={labelClass}
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Use at least 8 characters, including a letter and
                  a number.
                </p>
              </div>

              {/* Confirm Password */}

              <div>
                <label
                  htmlFor="confirmPassword"
                  className={labelClass}
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    maxLength={128}
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-violet-500/50 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Role Information */}

              <div className="flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.05] p-3.5">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-violet-400"
                />

                <p className="text-xs leading-5 text-slate-400">
                  Account permissions are assigned by the system.
                  Registration does not grant administrator or
                  pharmacist privileges.
                </p>
              </div>

              {/* Submit Button */}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />

                    Create account

                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}

            <div className="mt-7 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Security Footer */}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
              <ShieldCheck
                size={14}
                className="text-emerald-500/70"
              />

              Secure account registration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
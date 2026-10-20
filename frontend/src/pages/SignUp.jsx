
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
  User,
  UserPlus,
  BriefcaseBusiness,
} from "lucide-react";

import { useState } from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const ROLES = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "cashier", label: "Cashier" },
  {
    value: "inventory_manager",
    label: "Inventory Manager",
  },
  { value: "procurement", label: "Procurement Officer" },
];

const SignUp = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    requestedRole: "cashier",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const {
      firstName,
      lastName,
      email,
      requestedRole,
      password,
      confirmPassword,
    } = formData;

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !requestedRole ||
      !password ||
      !confirmPassword
    ) {
      return "Please complete all required fields.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!ROLES.some((role) => role.value === requestedRole)) {
      return "Please select a valid staff role.";
    }

    if (password.length < 8) {
      return "Your password must contain at least 8 characters.";
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Your password must contain at least one letter and one number.";
    }

    if (password.length > 72) {
      return "Your password must not exceed 72 characters.";
    }

    if (password !== confirmPassword) {
      return "Your passwords do not match.";
    }

    return "";
  };

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
        password: formData.password,
        requestedRole: formData.requestedRole,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Your registration request could not be completed."
        );
      }

      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess:
            response.data?.message ||
            "Your registration request has been submitted. An administrator must approve your account before you can sign in.",
          registeredEmail: formData.email.trim().toLowerCase(),
        },
      });
    } catch (requestError) {
      const status = requestError.response?.status;

      if (!requestError.response) {
        setError(
          "Unable to connect to PharmaCore. Please check your internet connection and try again."
        );
      } else if (status === 409) {
        setError(
          requestError.response?.data?.message ||
            "An account with this email already exists."
        );
      } else {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#111116] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-300";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080a] px-4 py-10 text-white">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
            <Pill className="text-violet-400" size={28} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Join <span className="text-violet-400">PharmaCore</span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Request access to your pharmacy workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0e0e13] p-6 shadow-2xl shadow-black/30 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-6 flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
              <p>{success}</p>
            </div>
          )}

          <div className="mb-6 flex gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-violet-400"
              size={20}
            />

            <div>
              <p className="text-sm font-semibold text-violet-200">
                Administrator approval required
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Select your requested role. Your account will remain
                pending until an administrator reviews your application.
                Administrator access cannot be requested through public
                registration.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="First name"
                  required
                  maxLength={50}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Last name"
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="email">
                Email address
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputClass} pl-11`}
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="requestedRole">
                Requested staff role
              </label>

              <div className="relative">
                <BriefcaseBusiness
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <select
                  id="requestedRole"
                  name="requestedRole"
                  value={formData.requestedRole}
                  onChange={handleChange}
                  className={`${inputClass} appearance-none pl-11`}
                  required
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="password">
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputClass} pl-11 pr-12`}
                  placeholder="At least 8 characters"
                  required
                  maxLength={72}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="relative">
                <LockKeyhole
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${inputClass} pl-11 pr-12`}
                  placeholder="Re-enter your password"
                  required
                  maxLength={72}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting request...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Submit registration request
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

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
  );
};

export default SignUp;
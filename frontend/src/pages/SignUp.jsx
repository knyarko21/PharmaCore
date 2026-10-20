

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Pill,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
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

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  requestedRole: "cashier",
  password: "",
  confirmPassword: "",
};

const SignUp = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithToken } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (firstName.trim().length > 50 || lastName.trim().length > 50) {
      return "Your first and last names must not exceed 50 characters.";
    }

    if (email.trim().length > 254) {
      return "Please use a shorter email address.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!ROLES.some((role) => role.value === requestedRole)) {
      return "Please select a valid staff role.";
    }

    if (password.length < 8) {
      return "Your password must contain at least 8 characters.";
    }

    if (password.length > 72) {
      return "Your password must not exceed 72 characters.";
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Use at least one letter and one number in your password.";
    }

    if (password !== confirmPassword) {
      return "Your passwords do not match.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        requestedRole: formData.requestedRole,
      });

      const data = response.data;

      if (!data?.success) {
        throw new Error(
          data?.message || "We could not create your account."
        );
      }

      if (data.token && data.user) {
        loginWithToken(data.user, data.token);
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess:
            data.message ||
            "Your account was created. You can now sign in.",
          registeredEmail: formData.email.trim().toLowerCase(),
        },
      });
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 409) {
        setError(
          requestError.response?.data?.message ||
            "An account with this email already exists."
        );
      } else if (status === 400 || status === 422) {
        setError(
          requestError.response?.data?.message ||
            "Please review your details and try again."
        );
      } else if (
        !requestError.response &&
        requestError.message === "Network Error"
      ) {
        setError(
          "Unable to reach PharmaCore. Check your connection and try again."
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
    "block w-full rounded-xl border border-white/[0.09] bg-[#111117] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[0.16] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

  const labelClass =
    "mb-2 block text-[13px] font-medium text-slate-300";

  const passwordInputClass =
    "block w-full rounded-xl border border-white/[0.09] bg-[#111117] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/[0.16] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080c] text-white">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-700/[0.12] blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/[0.08] blur-[130px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-10">
        {/* Top navigation */}
        <header className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            <span>Back to sign in</span>
          </Link>

          <Link
            to="/login"
            aria-label="PharmaCore home"
            className="flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
              <Pill size={20} className="text-violet-400" />
            </span>

            <span className="text-lg font-bold tracking-tight">
              Pharma<span className="text-violet-400">Core</span>
            </span>
          </Link>
        </header>

        {/* Main content */}
        <section className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            {/* Left information panel */}
            <aside className="hidden lg:block">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3.5 py-2 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Registration is open
              </div>

              <h1 className="max-w-md text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">
                Better pharmacy management starts{" "}
                <span className="text-violet-400">
                  with you.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                Create your account to access PharmaCore's pharmacy
                management workspace and the tools relevant to your
                role.
              </p>

              <div className="mt-10 space-y-5">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
                    <Activity size={19} className="text-violet-300" />
                  </span>

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      A connected workspace
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Manage pharmacy operations in one place.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
                    <ShieldCheck size={19} className="text-violet-300" />
                  </span>

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Secure account access
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Password-protected access and role-based permissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/[0.08]">
                    <CheckCircle2 size={19} className="text-violet-300" />
                  </span>

                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Get started quickly
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Complete registration and sign in when your account
                      is successfully created.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <ShieldCheck size={16} className="text-violet-400" />
                  Your access, your role
                </div>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Public registration is available for supported staff
                  roles. Administrator privileges cannot be assigned
                  through this form.
                </p>
              </div>
            </aside>

            {/* Registration form */}
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-7 lg:hidden">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Registration is open
                </div>

                <h1 className="text-3xl font-semibold tracking-tight">
                  Create your account
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Join PharmaCore and get started.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.09] bg-[#0e0e14]/95 p-5 shadow-2xl shadow-black/30 sm:p-8">
                <div className="mb-7 hidden lg:block">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Create your account
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Enter your details to get started.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-6 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3.5 text-sm text-red-300"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />
                    <p className="leading-6">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name fields */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="firstName"
                        className={labelClass}
                      >
                        First name
                      </label>

                      <div className="relative">
                        <UserRound
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          autoComplete="given-name"
                          value={formData.firstName}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="First name"
                          maxLength={50}
                          required
                          disabled={loading}
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
                        <UserRound
                          size={17}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          value={formData.lastName}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder="Last name"
                          maxLength={50}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="you@example.com"
                        maxLength={254}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      htmlFor="requestedRole"
                      className={labelClass}
                    >
                      Staff role
                    </label>

                    <div className="relative">
                      <BriefcaseBusiness
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <select
                        id="requestedRole"
                        name="requestedRole"
                        value={formData.requestedRole}
                        onChange={handleChange}
                        className={`${inputClass} appearance-none cursor-pointer`}
                        required
                        disabled={loading}
                      >
                        {ROLES.map((role) => (
                          <option
                            key={role.value}
                            value={role.value}
                          >
                            {role.label}
                          </option>
                        ))}
                      </select>

                      <ArrowRight
                        size={15}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-500"
                      />
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Choose the role that best describes your work.
                    </p>
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
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        className={passwordInputClass}
                        placeholder="Create a strong password"
                        minLength={8}
                        maxLength={72}
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`h-1 flex-1 rounded-full ${
                          formData.password.length >= 8
                            ? "bg-violet-400"
                            : "bg-white/10"
                        }`}
                      />
                      <span
                        className={`h-1 flex-1 rounded-full ${
                          /[A-Za-z]/.test(formData.password) &&
                          /[0-9]/.test(formData.password)
                            ? "bg-violet-400"
                            : "bg-white/10"
                        }`}
                      />
                      <span
                        className={`h-1 flex-1 rounded-full ${
                          formData.password.length >= 12 &&
                          /[A-Z]/.test(formData.password) &&
                          /[^A-Za-z0-9]/.test(formData.password)
                            ? "bg-violet-400"
                            : "bg-white/10"
                        }`}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Use at least 8 characters, including a letter
                      and a number.
                    </p>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className={labelClass}
                    >
                      Confirm password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={
                          showConfirmPassword ? "text" : "password"
                        }
                        autoComplete="new-password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={passwordInputClass}
                        placeholder="Enter your password again"
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) => !previous
                          )
                        }
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>

                    {formData.confirmPassword && (
                      <p
                        className={`mt-2 flex items-center gap-1.5 text-xs ${
                          formData.password === formData.confirmPassword
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formData.password === formData.confirmPassword ? (
                          <>
                            <Check size={13} />
                            Passwords match
                          </>
                        ) : (
                          "Passwords do not match"
                        )}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating your account...
                      </>
                    ) : (
                      <>
                        <UserRoundPlus size={17} />
                        Create account
                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs leading-5 text-slate-500">
                    By creating an account, you agree to use PharmaCore
                    responsibly and follow your assigned access permissions.
                  </p>
                </form>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/[0.07]" />
                  <span className="text-xs text-slate-600">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-white/[0.07]" />
                </div>

                <p className="text-center text-sm text-slate-400">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-violet-400 transition hover:text-violet-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-600">
                <ShieldCheck size={14} />
                Protected account access
              </div>
            </div>
          </div>
        </section>

        <footer className="py-4 text-center text-xs text-slate-600">
          PharmaCore Pharmacy Management System
        </footer>
      </div>
    </main>
  );
};

export default SignUp;

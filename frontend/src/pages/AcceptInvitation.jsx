
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Pill,
  ShieldCheck,
} from "lucide-react";

import api from "../services/api";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This invitation link is invalid or incomplete. Please request a new invitation."
      );
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/accept-invitation", {
        token,
        password,
        confirmPassword,
      });

      const account = response.data?.account;

      if (account?.role === "admin" && !account?.isActive) {
        setSuccess(
          "Your Admin account has been set up successfully. A Super Admin must activate your account before you can log in."
        );
      } else {
        setSuccess(
          "Your invitation has been accepted and your account is active. You can now log in."
        );
      }

      setPassword("");
      setConfirmPassword("");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "We could not accept your invitation. The link may have expired or already been used.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-4 py-10">
      {/* Background decoration */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            <Pill className="h-8 w-8 text-violet-400" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            Pharma<span className="text-violet-400">Core</span>
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Secure pharmacy management
          </p>
        </div>

        {/* Invitation card */}

        <div className="rounded-2xl border border-white/10 bg-[#111114]/95 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <ShieldCheck className="h-6 w-6 text-violet-400" />
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Accept your invitation
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Create a secure password to complete your PharmaCore
              account setup.
            </p>
          </div>

          {/* Error message */}

          {error && (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <p className="text-sm leading-5 text-red-300">
                {error}
              </p>
            </div>
          )}

          {/* Success message */}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
            >
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                <p className="text-sm leading-5 text-emerald-300">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoToLogin}
                className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Continue to Login
              </button>
            </div>
          )}

          {/* Missing token */}

          {!token && !success && (
            <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm leading-5 text-amber-300">
                No invitation token was found in this link. Please
                contact your administrator and request a new
                invitation.
              </p>
            </div>
          )}

          {/* Password form */}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Create password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                    disabled={loading || !token}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  Use at least 8 characters.
                </p>
              </div>

              {/* Confirm password */}

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    required
                    disabled={loading || !token}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading || !token}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Accepting invitation...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-violet-400 transition hover:text-violet-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          PharmaCore · Secure access for authorized pharmacy personnel
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitation;
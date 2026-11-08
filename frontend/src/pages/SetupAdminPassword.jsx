
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

const SetupAdminPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("The password setup link is invalid or missing its token.");
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

      const response = await api.post("/auth/setup-admin-password", {
        token,
        password,
        confirmPassword,
      });

      setSuccess(
        response.data.message ||
          "Your password has been created successfully. Your account is awaiting Super Admin activation."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to set your password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400">
            <Pill size={32} />
          </div>

          <h1 className="text-3xl font-bold text-white">
            PharmaCore
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Administrator account setup
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-violet-400">
              <ShieldCheck size={21} />
              <span className="text-sm font-semibold">
                Secure administrator setup
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white">
              Create your password
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Choose a secure password for your administrator account.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertCircle size={19} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-5">
              <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <CheckCircle2 size={21} className="shrink-0" />
                <span>{success}</span>
              </div>

              <p className="text-sm leading-6 text-slate-400">
                You can log in after the Super Admin activates your account.
              </p>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  New Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
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

              <p className="text-xs text-slate-500">
                Use at least 8 characters. Choose a password that you do not
                use for another account.
              </p>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating Password..." : "Create Password"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-800 pt-5 text-center">
            <Link
              to="/login"
              className="text-sm text-slate-400 transition hover:text-violet-400"
            >
              Return to Login
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          PharmaCore · Secure Pharmacy Management
        </p>
      </div>
    </div>
  );
};

export default SetupAdminPassword;
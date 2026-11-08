
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const getReturnPath = (location) => {
  const path = location.state?.from?.pathname;

  if (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path !== "/login"
  ) {
    return path;
  }

  return "/";
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resend verification state
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resending, setResending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);

      navigate(getReturnPath(location), { replace: true });
    } catch (loginError) {
      const message =
        loginError?.response?.data?.message ||
        loginError?.message ||
        "Unable to sign in. Check your details and try again.";

      setError(message);

      // Suggest email verification when the backend indicates
      // that the account has not been verified.
      if (
        /verif|verify|unverified/i.test(message)
      ) {
        setResendEmail(email.trim());
        setShowResend(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async (event) => {
    event.preventDefault();

    if (resending) return;

    const normalizedEmail = resendEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setResendError("Please enter your registered email address.");
      return;
    }

    setResendError("");
    setResendMessage("");
    setResending(true);

    try {
      const response = await api.post("/auth/resend-verification", {
        email: normalizedEmail,
      });

      setResendMessage(
        response?.data?.message ||
          "If your account requires verification, a verification email will be sent."
      );
    } catch (requestError) {
      setResendError(
        requestError?.response?.data?.message ||
          "We could not resend the verification email. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  const openResendSection = () => {
    setResendEmail(email.trim());
    setResendMessage("");
    setResendError("");
    setShowResend((previous) => !previous);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08080a] px-4 py-8 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0d0d10] p-6 shadow-xl sm:p-8">
        {/* LOGIN FORM */}

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
        >
          <h1 className="text-2xl font-bold text-white">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Access your PharmaCore account.
          </p>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {/* EMAIL */}

            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Email
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                disabled={submitting}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? "login-error" : undefined
                }
                className="w-full rounded-xl border border-zinc-800 bg-[#121317] px-3 py-2.5 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Password
              </label>

              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? "login-error" : undefined
                }
                className="w-full rounded-xl border border-zinc-800 bg-[#121317] px-3 py-2.5 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          {/* SIGN IN BUTTON */}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#0d0d10] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* EMAIL VERIFICATION */}

        <div className="mt-5 border-t border-zinc-800 pt-5">
          <button
            type="button"
            onClick={openResendSection}
            className="w-full text-center text-sm font-medium text-violet-400 transition hover:text-fuchsia-400"
          >
            {showResend
              ? "Hide verification options"
              : "Didn't receive your verification email?"}
          </button>

          {showResend && (
            <form
              onSubmit={handleResendVerification}
              className="mt-4 space-y-3"
              aria-busy={resending}
            >
              <p className="text-sm leading-6 text-zinc-400">
                Enter the email address you used when registering.
                We'll request another verification email for your account.
              </p>

              <div>
                <label
                  htmlFor="resend-email"
                  className="mb-1.5 block text-sm font-medium text-zinc-300"
                >
                  Registered email address
                </label>

                <input
                  id="resend-email"
                  name="resendEmail"
                  type="email"
                  value={resendEmail}
                  onChange={(event) => {
                    setResendEmail(event.target.value);
                    setResendError("");
                    setResendMessage("");
                  }}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  disabled={resending}
                  className="w-full rounded-xl border border-zinc-800 bg-[#121317] px-3 py-2.5 text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {resendError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {resendError}
                </div>
              )}

              {resendMessage && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                >
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || !resendEmail.trim()}
                className="w-full rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending
                  ? "Sending request..."
                  : "Resend verification email"}
              </button>
            </form>
          )}
        </div>

        {/* SIGNUP LINK */}

        <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
          <p className="text-sm text-zinc-400">
            Don't have an account?
          </p>

          <Link
            to="/signup"
            className="mt-2 inline-block font-semibold text-violet-400 transition hover:text-fuchsia-400"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
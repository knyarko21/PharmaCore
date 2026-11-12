

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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
  const [showInvitationHelp, setShowInvitationHelp] = useState(false);

  // ====================================================
  // Login
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setShowInvitationHelp(false);
    setSubmitting(true);

    try {
      await login(email.trim(), password);

      navigate(getReturnPath(location), {
        replace: true,
      });
    } catch (loginError) {
      const message =
        loginError?.response?.data?.message ||
        loginError?.message ||
        "Unable to sign in. Check your details and try again.";

      setError(message);

      if (/verif|verify|unverified|invitation/i.test(message)) {
        setShowInvitationHelp(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ====================================================
  // Render
  // ====================================================

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

        {/* INVITATION HELP */}

        {showInvitationHelp && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <h2 className="text-sm font-semibold text-amber-300">
              Account verification or invitation required
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              If your account has not been verified or you have
              not accepted your invitation, please contact your
              PharmaCore administrator for assistance.
            </p>
          </div>
        )}

        {/* INVITATION INFORMATION */}

        <div className="mt-6 border-t border-zinc-800 pt-5">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
            <h2 className="text-sm font-semibold text-violet-300">
              New to PharmaCore?
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              PharmaCore accounts are created through administrator
              invitations. Contact your administrator to receive
              an invitation link. You can then use that link to
              accept your invitation and create your password.
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500">
            PharmaCore Pharmacy Management System
          </p>
        </div>

      </div>
    </main>
  );
};

export default LoginPage;

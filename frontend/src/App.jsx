
import { Component } from "react";

import AppRoutes from "./routes/AppRoutes";
import api from "./services/api";
import { clearStoredToken } from "./context/authHelpers";

// ======================================================
// Error Boundary
// ======================================================

class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    // Send this to your error-monitoring service in production, if configured.
    console.error("App runtime error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReturnToLogin = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Continue clearing the local session if the server is unavailable.
      console.warn("Logout request failed:", error);
    } finally {
      clearStoredToken();

      if (api.defaults?.headers?.common) {
        delete api.defaults.headers.common.Authorization;
      }

      window.location.replace("/login");
    }
  };

  render() {
    if (this.state.hasError) {
      const showDetails = import.meta.env.DEV;

      return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-4 py-8 text-zinc-100 sm:px-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-rose-600/[0.08] blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
          </div>

          <section
            role="alert"
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-rose-500/20 bg-[#111116] p-5 shadow-2xl shadow-black/40 sm:p-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Application error
            </div>

            <h1 className="mt-4 text-2xl font-bold text-white">
              Something went wrong
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              The application encountered an error. You can try reloading,
              or return to the sign-in page.
            </p>

            {showDetails && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Development error details
                  </p>

                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/[0.08] bg-[#0b0b0d] p-4 font-mono text-xs text-zinc-300">
                    {this.state.error?.stack ||
                      this.state.error?.message ||
                      "No error details available."}
                  </pre>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Reload application
              </button>

              <button
                type="button"
                onClick={this.handleReturnToLogin}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                Return to sign in
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

// ======================================================
// App
// ======================================================

function App() {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100">
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </div>
  );
}

export default App;
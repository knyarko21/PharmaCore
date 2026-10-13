
import { Component } from "react";
import AppRoutes from "./routes/AppRoutes";

// ======================================================
// Error Boundary
// ======================================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error("App runtime error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#202026] px-4 py-8 text-zinc-100 sm:px-6">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-rose-600/[0.08] blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
          </div>

          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-rose-500/20 bg-[#25252b] p-5 shadow-2xl shadow-black/40 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Runtime error
            </div>

            <h1 className="mt-4 text-2xl font-bold text-white">
              Something broke while rendering
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              An error occurred while rendering the application. Copy the
              error message and stack trace if you need help diagnosing it.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Message
                </p>

                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-rose-500/20 bg-[#1c1c22] p-4 font-mono text-sm text-rose-200">
                  {this.state.error?.message || "(no message)"}
                </pre>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Stack trace
                </p>

                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/[0.08] bg-[#1c1c22] p-4 font-mono text-xs text-zinc-400">
                  {this.state.error?.stack || "(no stack)"}
                </pre>
              </div>
            </div>

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
                onClick={this.handleLogout}
                className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                Clear session and log out
              </button>
            </div>
          </div>
        </div>
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
    <div className="min-h-screen bg-[#202026] text-slate-100">
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </div>
  );
}

export default App;


import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080a] px-6 text-white">
      {/* Background effects */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-red-600/[0.07] blur-[120px]" />

        <div className="absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.08] bg-[#111114] p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <ShieldAlert
            size={38}
            className="text-red-400"
          />
        </div>

        <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-red-400">
          Error 403
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Access Denied
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-zinc-400">
          You are authenticated, but your account does not
          have permission to access this page.
          Contact your system administrator if you believe
          this is a mistake.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <LayoutDashboard size={17} />
            Go to Dashboard
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-600">
          PharmaCore · Secure Pharmacy Management
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;

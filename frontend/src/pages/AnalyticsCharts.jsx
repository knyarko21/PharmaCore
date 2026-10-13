
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ChartsContent = lazy(() => import("./AnalyticsChartsContent"));

const AnalyticsCharts = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/[0.06] bg-black/20">
          <div className="flex flex-col items-center gap-3">
            <Loader2
              size={26}
              className="animate-spin text-violet-400"
            />

            <p className="text-sm text-zinc-500">
              Loading charts...
            </p>
          </div>
        </div>
      }
    >
      <ChartsContent {...props} />
    </Suspense>
  );
};

export default AnalyticsCharts;
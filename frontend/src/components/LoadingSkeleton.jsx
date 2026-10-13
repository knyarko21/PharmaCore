
// ======================================================
// Loading Skeleton Primitives
// ======================================================
//
// Shimmering placeholders for use while data loads.
// Every component below accepts className to extend or
// override the base style.
// ======================================================

const shimmer =
  "relative overflow-hidden bg-white/[0.03] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent";

// ======================================================
// Base block
// ======================================================

export const SkeletonBlock = ({ className = "" }) => (
  <div className={`${shimmer} rounded-xl ${className}`} />
);

// ======================================================
// Card skeleton
// ======================================================

export const SkeletonCard = ({ className = "" }) => (
  <div
    className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 ${className}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-32" />
        <SkeletonBlock className="h-3 w-40" />
      </div>

      <SkeletonBlock className="h-11 w-11 rounded-xl" />
    </div>
  </div>
);

// ======================================================
// Table row skeleton
// ======================================================

export const SkeletonTableRow = ({ columns = 6 }) => (
  <tr className="border-b border-white/[0.04]">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <SkeletonBlock
          className={
            index === 0
              ? "h-11 w-11 rounded-xl"
              : "h-4"
          }
        />
      </td>
    ))}
  </tr>
);

// ======================================================
// Table skeleton
// ======================================================

export const SkeletonTable = ({
  rows = 6,
  columns = 6
}) => (
  <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-2xl">
    <div className="border-b border-white/[0.06] bg-white/[0.015] px-6 py-4">
      <SkeletonBlock className="h-4 w-40" />
    </div>

    <table className="w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonTableRow
            key={index}
            columns={columns}
          />
        ))}
      </tbody>
    </table>
  </div>
);

// ======================================================
// Page header skeleton
// ======================================================

export const SkeletonPageHeader = () => (
  <div className="flex items-start gap-4">
    <SkeletonBlock className="h-10 w-10 rounded-xl" />

    <div className="flex-1 space-y-3">
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="h-4 w-80" />
    </div>

    <SkeletonBlock className="h-10 w-32 rounded-xl" />
  </div>
);

// ======================================================
// KPI grid skeleton
// ======================================================

export const SkeletonKpiGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

// ======================================================
// Default export for convenience
// ======================================================

const LoadingSkeleton = {
  Block: SkeletonBlock,
  Card: SkeletonCard,
  Table: SkeletonTable,
  TableRow: SkeletonTableRow,
  PageHeader: SkeletonPageHeader,
  KpiGrid: SkeletonKpiGrid
};

export default LoadingSkeleton;
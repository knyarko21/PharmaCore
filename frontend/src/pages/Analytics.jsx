
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

// ======================================================
// Lazy-loaded Charts
// ======================================================

const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

// ======================================================
// Formatting Helpers
// ======================================================

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-GH").format(
    Number(value || 0)
  );
};

const formatPercentage = (value) => {
  return `${Number(value || 0).toFixed(2)}%`;
};

// ======================================================
// KPI Stat Card
// ======================================================

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  positive = true,
  accent = "violet",
}) => {
  const accents = {
    violet: {
      background: "bg-violet-500/10",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
      value: "text-violet-300",
    },
    emerald: {
      background: "bg-emerald-500/10",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
      value: "text-emerald-400",
    },
    sky: {
      background: "bg-sky-500/10",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
      value: "text-sky-300",
    },
    amber: {
      background: "bg-amber-500/10",
      icon: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
      value: "text-amber-300",
    },
  };

  const style = accents[accent] || accents.violet;

  const valueClass = positive
    ? style.value
    : "text-rose-400";

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[#292932] bg-[#111116] p-4 sm:p-5">
      <div
        className={`pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full ${style.background}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-400">
            {title}
          </p>

          <p
            className={`mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl ${valueClass}`}
          >
            {value}
          </p>

          {subtitle && (
            <p className="mt-2 break-words text-xs leading-5 text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:h-11 sm:w-11 ${style.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

// ======================================================
// Section Header
// ======================================================

const SectionHeader = ({
  title,
  description,
  icon: Icon,
}) => {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-[#211632] text-violet-400 sm:h-12 sm:w-12">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-5 text-zinc-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// ======================================================
// Chart Loading Fallback
// ======================================================

const ChartLoadingFallback = () => {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[#292932] bg-[#111116] p-6 sm:min-h-[320px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2
          size={28}
          className="animate-spin text-violet-400"
        />

        <p className="text-center text-sm text-zinc-400">
          Loading analytics charts...
        </p>
      </div>
    </div>
  );
};

// ======================================================
// Analytics Component
// ======================================================

const Analytics = () => {
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [salesTrends, setSalesTrends] = useState(null);
  const [topSelling, setTopSelling] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ====================================================
  // Fetch Analytics Data
  // ====================================================

  const fetchAll = useCallback(async () => {
    const [
      salesResponse,
      trendsResponse,
      topSellingResponse,
    ] = await Promise.all([
      api.get("/analytics/sales"),
      api.get("/analytics/trends"),
      api.get("/analytics/top-selling"),
    ]);

    return {
      salesAnalytics:
        salesResponse.data?.analytics || null,

      salesTrends:
        trendsResponse.data || null,

      topSelling:
        topSellingResponse.data || null,
    };
  }, []);

  // ====================================================
  // Initial Data Load
  // ====================================================

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchAll();

        if (!mounted) return;

        setSalesAnalytics(data.salesAnalytics);
        setSalesTrends(data.salesTrends);
        setTopSelling(data.topSelling);
      } catch (err) {
        if (!mounted) return;

        console.error(
          "Failed to load analytics:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load analytics. Please try again."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [fetchAll]);

  // ====================================================
  // Refresh Analytics
  // ====================================================

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    setError("");

    try {
      const data = await fetchAll();

      setSalesAnalytics(data.salesAnalytics);
      setSalesTrends(data.salesTrends);
      setTopSelling(data.topSelling);
    } catch (err) {
      console.error(
        "Failed to refresh analytics:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to refresh analytics. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll, refreshing]);

  // ====================================================
  // Derived Analytics Values
  // ====================================================

  const today = useMemo(
    () => salesAnalytics?.today || {},
    [salesAnalytics]
  );

  const month = useMemo(
    () => salesAnalytics?.month || {},
    [salesAnalytics]
  );

  const trends = useMemo(
    () => salesTrends?.trends || [],
    [salesTrends]
  );

  const trendSummary = useMemo(
    () => salesTrends?.summary || {},
    [salesTrends]
  );

  const topToday = useMemo(
    () => topSelling?.today || [],
    [topSelling]
  );

  const topMonth = useMemo(
    () => topSelling?.month || [],
    [topSelling]
  );

  const last7Days = useMemo(
    () => trends.slice(-7),
    [trends]
  );

  // ====================================================
  // Revenue by Category
  // ====================================================

  const categoryPie = useMemo(() => {
    const totals = {};

    topMonth.forEach((medicine) => {
      const category = medicine.category || "Other";

      totals[category] =
        (totals[category] || 0) +
        Number(medicine.revenue || 0);
    });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [topMonth]);

  // ====================================================
  // Initial Loading State
  // ====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-[#171120]">
            <Loader2
              size={28}
              className="animate-spin text-violet-400"
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              Loading analytics
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Preparing your pharmacy performance data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // Error State
  // ====================================================

  if (error) {
    return (
      <div className="min-h-full bg-[#08080a] px-4 py-6 text-zinc-100 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-500/20 bg-[#111116] p-5 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-[#251316] text-rose-400">
            <Activity size={24} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-white">
            Unable to load analytics
          </h2>

          <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-zinc-400">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#111116] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing ? "Retrying..." : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // Analytics Dashboard
  // ====================================================

  return (
    <div className="relative isolate min-h-full bg-[#08080a] text-zinc-100">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 pb-10 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-400 sm:tracking-[0.16em]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-violet-500/20 bg-[#211632]">
                <BarChart3 size={13} />
              </span>

              Business Intelligence
            </div>

            <h1 className="mt-3 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Analytics

              <Sparkles
                size={19}
                className="text-violet-400"
              />
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Monitor pharmacy sales, profitability, and
              medicine performance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#30303a] bg-[#15151b] px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-500/40 hover:bg-[#1b1923] focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* Today's Performance */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Clock3
              size={17}
              className="text-violet-400"
            />

            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Today's performance
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(today.revenue)}
              subtitle={`${formatNumber(today.salesCount)} completed sales`}
              icon={CircleDollarSign}
              accent="violet"
              positive={Number(today.revenue) >= 0}
            />

            <StatCard
              title="Today's Profit"
              value={formatCurrency(today.profit)}
              subtitle={`${formatPercentage(today.profitMargin)} margin`}
              icon={TrendingUp}
              positive={Number(today.profit) >= 0}
              accent="emerald"
            />

            <StatCard
              title="Units Sold"
              value={formatNumber(today.unitsSold)}
              subtitle="Medicine units sold today"
              icon={Package}
              accent="sky"
              positive
            />

            <StatCard
              title="Sales Count"
              value={formatNumber(today.salesCount)}
              subtitle="Completed transactions"
              icon={CheckCircle2}
              accent="amber"
              positive
            />
          </div>
        </section>

        {/* Monthly Performance */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays
              size={17}
              className="text-violet-400"
            />

            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Current month
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(month.revenue)}
              subtitle={`${formatNumber(month.salesCount)} completed sales`}
              icon={Wallet}
              accent="violet"
              positive={Number(month.revenue) >= 0}
            />

            <StatCard
              title="Monthly Profit"
              value={formatCurrency(month.profit)}
              subtitle={`${formatPercentage(month.profitMargin)} margin`}
              icon={Coins}
              positive={Number(month.profit) >= 0}
              accent="emerald"
            />

            <StatCard
              title="Monthly Units"
              value={formatNumber(month.unitsSold)}
              subtitle="Medicine units sold"
              icon={Package}
              accent="sky"
              positive
            />

            <StatCard
              title="Monthly Cost"
              value={formatCurrency(month.cost)}
              subtitle="Estimated purchase cost"
              icon={TrendingDown}
              positive={false}
              accent="amber"
            />
          </div>
        </section>

        {/* Sales Trends Charts */}
        <section>
          <Suspense fallback={<ChartLoadingFallback />}>
            <AnalyticsCharts
              mode="trends"
              trends={trends}
              trendSummary={trendSummary}
              last7Days={last7Days}
              salesTrends={salesTrends}
            />
          </Suspense>
        </section>

        {/* Top Sellers and Category Revenue */}
        <section className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Top-selling Medicines */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#292932] bg-[#111116] p-4 sm:p-6">
            <SectionHeader
              title="Top-selling medicines"
              description="Medicines ranked by units sold"
              icon={Package}
            />

            {/* Top Seller Highlights */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-violet-500/20 bg-[#171320] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                  Today's top seller
                </p>

                <p className="mt-2 break-words text-lg font-semibold text-white">
                  {topToday[0]?.name || "No sales today"}
                </p>

                {topToday[0] && (
                  <p className="mt-2 break-words text-sm leading-5 text-zinc-400">
                    {formatNumber(topToday[0].unitsSold)} units sold
                    {" · "}
                    {formatCurrency(topToday[0].revenue)}
                  </p>
                )}
              </div>

              <div className="min-w-0 rounded-xl border border-emerald-500/20 bg-[#111d19] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  Monthly top seller
                </p>

                <p className="mt-2 break-words text-lg font-semibold text-white">
                  {topMonth[0]?.name || "No sales this month"}
                </p>

                {topMonth[0] && (
                  <p className="mt-2 break-words text-sm leading-5 text-zinc-400">
                    {formatNumber(topMonth[0].unitsSold)} units sold
                    {" · "}
                    {formatCurrency(topMonth[0].revenue)}
                  </p>
                )}
              </div>
            </div>

            {/* Top Sellers Table */}
            {topMonth.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[#34343e] bg-[#0c0c10] p-5">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#30303a] bg-[#15151b]">
                    <Package
                      size={26}
                      className="text-zinc-500"
                    />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-zinc-300">
                    No medicine sales yet
                  </p>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Top-selling medicines will appear here
                    after completed sales.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#292932]">
                <table className="w-full min-w-[650px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#292932] bg-[#18181f]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        #
                      </th>

                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        Medicine
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        Units
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        Revenue
                      </th>

                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        Profit
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#25252d]">
                    {topMonth.map((medicine, index) => (
                      <tr
                        key={medicine.medicineId ?? index}
                        className="bg-[#111116] hover:bg-[#17171e]"
                      >
                        <td className="px-4 py-4">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                              index === 0
                                ? "border border-violet-500/30 bg-[#251a37] text-violet-300"
                                : "border border-[#30303a] bg-[#1a1a21] text-zinc-400"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </td>

                        <td className="max-w-[240px] px-4 py-4">
                          <p className="break-words text-sm font-medium text-white">
                            {medicine.name || "Unknown medicine"}
                          </p>

                          <p className="mt-1 break-words text-xs text-zinc-500">
                            SKU: {medicine.sku || "N/A"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-white">
                          {formatNumber(medicine.unitsSold)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-zinc-300">
                          {formatCurrency(medicine.revenue)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-emerald-400">
                          {formatCurrency(medicine.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Category Revenue Chart */}
          <div className="min-w-0">
            <Suspense fallback={<ChartLoadingFallback />}>
              <AnalyticsCharts
                mode="pie"
                categoryPie={categoryPie}
              />
            </Suspense>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-[#292932] pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Analytics are calculated from completed sales.
          </p>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

            <span>Data synced with PharmaCore</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Analytics;
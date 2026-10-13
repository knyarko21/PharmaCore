
import {
  BarChart3,
  TrendingUp,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
  });
};

const formatLongDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ======================================================
// Chart Colors
// ======================================================

const COLORS = {
  violet: "#a78bfa",
  fuchsia: "#e879f9",
  emerald: "#34d399",
  amber: "#fbbf24",
  sky: "#38bdf8",
  rose: "#fb7185",
  cyan: "#22d3ee",
};

const PIE_COLORS = [
  COLORS.violet,
  COLORS.fuchsia,
  COLORS.emerald,
  COLORS.amber,
  COLORS.sky,
  COLORS.rose,
  COLORS.cyan,
];

// ======================================================
// Custom Chart Tooltip
// ======================================================

const ChartTooltip = ({
  active,
  payload,
  label,
  currency = true,
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0e0e11]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <p className="mb-2 text-xs font-semibold text-white">
        {formatLongDate(label)}
      </p>

      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4 text-xs"
        >
          <span className="flex items-center gap-2 text-zinc-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: entry.color,
              }}
            />

            {entry.name}
          </span>

          <span className="font-medium text-white">
            {currency
              ? formatCurrency(entry.value)
              : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ======================================================
// Chart Section Header
// ======================================================

const SectionHeader = ({
  title,
  description,
  icon: Icon,
}) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20">
      <Icon size={19} />
    </div>

    <div>
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-zinc-500">
          {description}
        </p>
      )}
    </div>
  </div>
);

// ======================================================
// Chart Components
// ======================================================

const RevenueTrendChart = ({ trends }) => (
  <div>
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      Daily Revenue · Cost · Profit
    </p>

    <div className="h-[320px] rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trends}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(255, 255, 255, 0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatDate}
            minTickGap={40}
          />

          <YAxis
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              `GH₵${Number(value).toLocaleString()}`
            }
          />

          <Tooltip content={<ChartTooltip />} />

          <Legend
            wrapperStyle={{
              fontSize: "11px",
              paddingTop: "10px",
            }}
          />

          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={COLORS.violet}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: COLORS.violet,
            }}
          />

          <Line
            type="monotone"
            dataKey="cost"
            name="Cost"
            stroke={COLORS.amber}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: COLORS.amber,
            }}
          />

          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke={COLORS.emerald}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: COLORS.emerald,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const RevenueAreaChart = ({ trends }) => (
  <div>
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      Cumulative Revenue vs Profit
    </p>

    <div className="h-[280px] rounded-2xl border border-white/[0.06] bg-black/20 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={trends}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient
              id="revenueGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={COLORS.violet}
                stopOpacity={0.5}
              />

              <stop
                offset="95%"
                stopColor={COLORS.violet}
                stopOpacity={0}
              />
            </linearGradient>

            <linearGradient
              id="profitGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={COLORS.emerald}
                stopOpacity={0.5}
              />

              <stop
                offset="95%"
                stopColor={COLORS.emerald}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(255, 255, 255, 0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatDate}
            minTickGap={40}
          />

          <YAxis
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              `GH₵${Number(value).toLocaleString()}`
            }
          />

          <Tooltip content={<ChartTooltip />} />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={COLORS.violet}
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />

          <Area
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke={COLORS.emerald}
            strokeWidth={2}
            fill="url(#profitGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const UnitsSoldChart = ({ last7Days }) => {
  if (!last7Days.length) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Units Sold · Last 7 Days
      </p>

      <div className="h-[260px] rounded-2xl border border-white/[0.06] bg-black/20 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={last7Days}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="barGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={COLORS.fuchsia}
                  stopOpacity={1}
                />

                <stop
                  offset="100%"
                  stopColor={COLORS.violet}
                  stopOpacity={0.6}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="rgba(255, 255, 255, 0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              stroke="#52525b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatDate}
            />

            <YAxis
              stroke="#52525b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              content={<ChartTooltip currency={false} />}
            />

            <Bar
              dataKey="unitsSold"
              name="Units Sold"
              fill="url(#barGradient)"
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ======================================================
// Summary Tiles
// ======================================================

const SummaryTile = ({
  title,
  value,
  variant = "default",
}) => {
  const variants = {
    default:
      "border-white/[0.06] bg-black/20 text-white",
    profit:
      "border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] to-transparent text-emerald-400",
    margin:
      "border-violet-500/15 bg-gradient-to-br from-violet-500/[0.06] to-transparent text-violet-400",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        variants[variant] || variants.default
      }`}
    >
      <p className="text-xs text-zinc-500">{title}</p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
};

// ======================================================
// Analytics Charts Content
// ======================================================

const AnalyticsChartsContent = ({
  mode,
  trends = [],
  trendSummary = {},
  last7Days = [],
  salesTrends = null,
  categoryPie = [],
}) => {
  // Category revenue pie chart
  if (mode === "pie") {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6">
        <SectionHeader
          title="Revenue by medicine"
          description="Top contributors this month"
          icon={TrendingUp}
        />

        {categoryPie.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-black/20">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <BarChart3
                  size={26}
                  className="text-zinc-600"
                />
              </div>

              <p className="mt-3 text-sm font-medium text-zinc-400">
                No data yet
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Revenue distribution appears after sales.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[320px] rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryPie.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        PIE_COLORS[
                          index % PIE_COLORS.length
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    formatCurrency(value)
                  }
                  contentStyle={{
                    background: "rgba(14, 14, 17, 0.95)",
                    border:
                      "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    backdropFilter: "blur(12px)",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />

                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{
                    fontSize: "11px",
                    color: "#a1a1aa",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  // Revenue, cost, profit and sales trend charts
  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6">
      <SectionHeader
        title="Sales performance"
        description={`30-day sales trend from ${
          salesTrends?.period?.startDate || "-"
        } to ${salesTrends?.period?.endDate || "-"}`}
        icon={BarChart3}
      />

      <div className="space-y-6">
        <RevenueTrendChart trends={trends} />

        <RevenueAreaChart trends={trends} />

        <UnitsSoldChart last7Days={last7Days} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile
          title="Revenue"
          value={formatCurrency(trendSummary.revenue)}
        />

        <SummaryTile
          title="Cost"
          value={formatCurrency(trendSummary.cost)}
        />

        <SummaryTile
          title="Profit"
          value={formatCurrency(trendSummary.profit)}
          variant="profit"
        />

        <SummaryTile
          title="Units Sold"
          value={formatNumber(trendSummary.unitsSold)}
        />

        <SummaryTile
          title="Margin"
          value={formatPercentage(
            trendSummary.profitMargin
          )}
          variant="margin"
        />
      </div>
    </section>
  );
};

export default AnalyticsChartsContent;
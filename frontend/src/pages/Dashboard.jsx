
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Package,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
  XCircle
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";

// ======================================================
// Constants
// ======================================================

const PAGE_BACKGROUND = "bg-[#090b10]";
const PANEL_BACKGROUND = "bg-[#10141c]";
const PANEL_BORDER = "border border-white/[0.08]";

const EMPTY_DASHBOARD = {
  inventory: {
    totalMedicines: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringBatchCount: 0,
    expiredBatchCount: 0
  },
  sales: {
    todayRevenue: 0,
    todayCount: 0,
    monthlyRevenue: 0,
    monthlyCount: 0
  },
  prescriptions: {
    total: 0,
    pending: 0,
    approved: 0,
    dispensed: 0,
    rejected: 0
  },
  recentSales: []
};

// ======================================================
// General Helpers
// ======================================================

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) =>
  toNumber(value).toLocaleString("en-GH");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNumber(value));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const getSaleReference = (sale) =>
  sale?.saleNumber ||
  sale?.reference ||
  sale?.invoiceNumber ||
  sale?.receiptNumber ||
  (sale?.id ? `SALE-${String(sale.id).padStart(6, "0")}` : "Sale");

const getCustomerName = (sale) => {
  const customer = sale?.customer;

  if (typeof customer === "string") return customer;

  return (
    customer?.name ||
    customer?.fullName ||
    sale?.customerName ||
    sale?.customer_name ||
    "Walk-in customer"
  );
};

const getSaleAmount = (sale) =>
  sale?.totalAmount ??
  sale?.total ??
  sale?.grandTotal ??
  sale?.amount ??
  0;

const getSaleDate = (sale) =>
  sale?.createdAt ||
  sale?.created_at ||
  sale?.saleDate ||
  sale?.date;

const getStatusStyle = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "dispensed" ||
    normalized === "approved" ||
    normalized === "paid"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    normalized === "pending" ||
    normalized === "processing"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "rejected" ||
    normalized === "failed"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-slate-500/20 bg-slate-500/10 text-slate-300";
};

const getPrescriptionStatus = (prescription) =>
  prescription?.status ||
  prescription?.prescriptionStatus ||
  "Pending";

const getPrescriptionCount = (prescriptions, status) => {
  const key = status.toLowerCase();

  const directValue = prescriptions?.[key];

  if (directValue !== undefined && directValue !== null) {
    return toNumber(directValue);
  }

  const items = prescriptions?.recentPrescriptions;

  if (Array.isArray(items)) {
    return items.filter(
      (item) =>
        String(getPrescriptionStatus(item)).toLowerCase() === key
    ).length;
  }

  return 0;
};

// ======================================================
// Reusable UI Components
// ======================================================

const IconBox = ({
  children,
  className = "",
  size = "md"
}) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.05] ${className}`}
    >
      {children}
    </div>
  );
};

const SectionHeading = ({
  icon: Icon,
  title,
  description,
  iconClass = "bg-violet-500/10 text-violet-300"
}) => (
  <div className="flex min-w-0 items-center gap-3">
    <IconBox className={iconClass}>
      <Icon size={19} />
    </IconBox>

    <div className="min-w-0">
      <h2 className="font-semibold text-white">{title}</h2>

      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  </div>
);

const SectionLink = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.08] bg-[#151a24] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-violet-500/30 hover:bg-[#1b2230] hover:text-white"
  >
    {children}
    <ArrowUpRight size={14} />
  </button>
);

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${getStatusStyle(
      status
    )}`}
  >
    {String(status || "Unknown").replace(/_/g, " ")}
  </span>
);

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  onClick
}) => {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <IconBox size="lg" className={iconClass}>
          <Icon size={21} />
        </IconBox>

        {onClick && (
          <ArrowUpRight
            size={16}
            className="text-slate-600 transition-colors group-hover:text-violet-300"
          />
        )}
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-sm text-slate-400">{title}</p>

        <p className="mt-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {value}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </>
  );

  const className = `group min-w-0 rounded-2xl ${PANEL_BORDER} ${PANEL_BACKGROUND} p-5 text-left transition-colors hover:border-white/[0.14] ${
    onClick ? "cursor-pointer hover:bg-[#141a25]" : ""
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full ${className}`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
};

const LoadingState = () => (
  <div className="flex min-h-[55vh] items-center justify-center px-4">
    <div className="flex flex-col items-center text-center">
      <IconBox
        size="lg"
        className="bg-violet-500/10 text-violet-300 ring-violet-500/20"
      >
        <Pill size={25} />
      </IconBox>

      <p className="mt-4 font-semibold text-white">
        Loading your pharmacy overview
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Retrieving your dashboard information.
      </p>

      <div className="mt-5 h-1 w-36 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-1/2 rounded-full bg-violet-500" />
      </div>
    </div>
  </div>
);

const EmptyState = ({
  icon: Icon = Package,
  title,
  description,
  action,
  onAction
}) => (
  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
    <IconBox
      size="lg"
      className="bg-slate-500/10 text-slate-400"
    >
      <Icon size={22} />
    </IconBox>

    <h3 className="mt-4 text-sm font-semibold text-slate-200">
      {title}
    </h3>

    <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500">
      {description}
    </p>

    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171c27] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-violet-500/30 hover:text-white"
      >
        {action}
        <ArrowRight size={14} />
      </button>
    )}
  </div>
);

// ======================================================
// Dashboard
// ======================================================

const Dashboard = () => {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------
  // Fetch dashboard data
  // ----------------------------------------------------

  const fetchDashboard = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const hasExistingDashboard = Boolean(dashboard);

    if (hasExistingDashboard) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/dashboard/overview");

      if (requestId !== requestIdRef.current) return;

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload.message || "Unable to load dashboard."
        );
      }

      const result = payload?.dashboard;

      if (!result || typeof result !== "object") {
        throw new Error(
          "The dashboard API did not return the expected dashboard data."
        );
      }

      setDashboard({
        ...EMPTY_DASHBOARD,
        ...result,
        inventory: {
          ...EMPTY_DASHBOARD.inventory,
          ...(result.inventory || {})
        },
        sales: {
          ...EMPTY_DASHBOARD.sales,
          ...(result.sales || {})
        },
        prescriptions: {
          ...EMPTY_DASHBOARD.prescriptions,
          ...(result.prescriptions || {})
        },
        recentSales: Array.isArray(result.recentSales)
          ? result.recentSales
          : []
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      console.error("Dashboard fetch error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load dashboard data. Please try again."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dashboard]);

  // Fetch when the component first mounts.
  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      void fetchDashboard();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      requestIdRef.current += 1;
    };
  }, []); // Intentionally fetch once on initial mount.

  // ----------------------------------------------------
  // Safe data access
  // ----------------------------------------------------

  const inventory = dashboard?.inventory || EMPTY_DASHBOARD.inventory;
  const sales = dashboard?.sales || EMPTY_DASHBOARD.sales;
  const prescriptions =
    dashboard?.prescriptions || EMPTY_DASHBOARD.prescriptions;
  const recentSales = dashboard?.recentSales || [];

  const totalMedicines = toNumber(inventory.totalMedicines);
  const totalUnits = toNumber(inventory.totalUnits);
  const lowStockCount = toNumber(inventory.lowStockCount);
  const outOfStockCount = toNumber(inventory.outOfStockCount);
  const expiringBatchCount = toNumber(inventory.expiringBatchCount);
  const expiredBatchCount = toNumber(inventory.expiredBatchCount);

  const todayRevenue = toNumber(sales.todayRevenue);
  const todayCount = toNumber(sales.todayCount);
  const monthlyRevenue = toNumber(sales.monthlyRevenue);
  const monthlyCount = toNumber(sales.monthlyCount);

  const prescriptionTotal = toNumber(prescriptions.total);

  // ----------------------------------------------------
  // Setup checklist
  // ----------------------------------------------------

  const setupSteps = useMemo(
    () => [
      {
        title: "Add your first medicine",
        description:
          "Create your medicine catalogue with names, SKUs and reorder levels.",
        completed: totalMedicines > 0,
        icon: Pill,
        path: "/medicines",
        action: "Manage medicines"
      },
      {
        title: "Build your inventory",
        description:
          "Track stock quantities, batches and expiry dates.",
        completed: totalUnits > 0,
        icon: Boxes,
        path: "/inventory",
        action: "Open inventory"
      },
      {
        title: "Record a sale",
        description:
          "Record completed pharmacy transactions and keep track of revenue.",
        completed:
          todayCount > 0 ||
          monthlyCount > 0 ||
          recentSales.length > 0,
        icon: ShoppingCart,
        path: "/sales",
        action: "Open sales"
      },
      {
        title: "Manage prescriptions",
        description:
          "Keep prescription records organised and up to date.",
        completed: prescriptionTotal > 0,
        icon: FileText,
        path: "/prescriptions",
        action: "Open prescriptions"
      }
    ],
    [
      totalMedicines,
      totalUnits,
      todayCount,
      monthlyCount,
      recentSales.length,
      prescriptionTotal
    ]
  );

  const completedSteps = setupSteps.filter(
    (step) => step.completed
  ).length;

  const setupProgress = Math.round(
    (completedSteps / setupSteps.length) * 100
  );

  const isFreshStart =
    totalMedicines === 0 &&
    totalUnits === 0 &&
    recentSales.length === 0 &&
    prescriptionTotal === 0;

  // ----------------------------------------------------
  // Main statistic cards
  // ----------------------------------------------------

  const statCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      description: `${formatNumber(todayCount)} completed sale${
        todayCount === 1 ? "" : "s"
      } today`,
      icon: Wallet,
      iconClass: "bg-emerald-500/10 text-emerald-300",
      onClick: () => navigate("/sales")
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(monthlyRevenue),
      description: `${formatNumber(monthlyCount)} completed sale${
        monthlyCount === 1 ? "" : "s"
      } this month`,
      icon: TrendingUp,
      iconClass: "bg-violet-500/10 text-violet-300",
      onClick: () => navigate("/sales")
    },
    {
      title: "Active Medicines",
      value: formatNumber(totalMedicines),
      description: `${formatNumber(totalUnits)} units tracked`,
      icon: Pill,
      iconClass: "bg-sky-500/10 text-sky-300",
      onClick: () => navigate("/medicines")
    },
    {
      title: "Low Stock Items",
      value: formatNumber(lowStockCount),
      description: `${formatNumber(outOfStockCount)} out of stock`,
      icon: AlertTriangle,
      iconClass:
        lowStockCount > 0 || outOfStockCount > 0
          ? "bg-amber-500/10 text-amber-300"
          : "bg-emerald-500/10 text-emerald-300",
      onClick: () => navigate("/inventory")
    }
  ];

  // ----------------------------------------------------
  // Prescription statistics
  // ----------------------------------------------------

  const pendingPrescriptions = getPrescriptionCount(
    prescriptions,
    "pending"
  );

  const approvedPrescriptions = getPrescriptionCount(
    prescriptions,
    "approved"
  );

  const dispensedPrescriptions = getPrescriptionCount(
    prescriptions,
    "dispensed"
  );

  const rejectedPrescriptions = getPrescriptionCount(
    prescriptions,
    "rejected"
  );

  const prescriptionStats = [
    {
      title: "Total prescriptions",
      value: prescriptionTotal,
      icon: FileText,
      iconClass: "bg-violet-500/10 text-violet-300"
    },
    {
      title: "Pending review",
      value: pendingPrescriptions,
      icon: Clock3,
      iconClass: "bg-amber-500/10 text-amber-300"
    },
    {
      title: "Approved",
      value: approvedPrescriptions,
      icon: CheckCircle2,
      iconClass: "bg-sky-500/10 text-sky-300"
    },
    {
      title: "Dispensed",
      value: dispensedPrescriptions,
      icon: Pill,
      iconClass: "bg-emerald-500/10 text-emerald-300"
    }
  ];

  // ----------------------------------------------------
  // Loading screen
  // ----------------------------------------------------

  if (loading && !dashboard) {
    return <LoadingState />;
  }

  // ----------------------------------------------------
  // Error screen
  // ----------------------------------------------------

  if (error && !dashboard) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center px-4">
        <div
          className={`w-full rounded-3xl ${PANEL_BORDER} bg-[#10141c] p-6 sm:p-8`}
        >
          <IconBox
            size="lg"
            className="bg-red-500/10 text-red-300 ring-red-500/20"
          >
            <AlertTriangle size={24} />
          </IconBox>

          <h2 className="mt-5 text-xl font-bold text-white">
            We couldn't load your dashboard
          </h2>

          <p className="mt-3 break-words text-sm leading-6 text-slate-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void fetchDashboard()}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  // ----------------------------------------------------
  // Main overview
  // ----------------------------------------------------

  return (
    <div
      className={`min-h-full min-w-0 ${PAGE_BACKGROUND} pb-8 text-slate-100`}
    >
      <div className="min-w-0 space-y-7 sm:space-y-8">
        {/* ================================================
            Header
        ================================================ */}

        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                <Activity size={15} />
              </span>
              PharmaCore workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pharmacy Overview
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor sales, manage inventory health and keep track
              of your pharmacy operations in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#10141c] px-3 py-2 text-xs text-slate-400">
              <CalendarDays
                size={15}
                className="text-emerald-300"
              />
              {new Intl.DateTimeFormat("en-GH", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
              }).format(new Date())}
            </div>

            <button
              type="button"
              onClick={() => void fetchDashboard()}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#10141c] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-violet-500/30 hover:bg-[#171c27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* ================================================
            Error notice when existing data is available
        ================================================ */}

        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle
                size={19}
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-200">
                  Could not refresh dashboard data
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                  {error} Previously loaded information is still displayed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchDashboard()}
              disabled={refreshing}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/10 disabled:opacity-50 sm:self-center"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* ================================================
            Welcome Banner
        ================================================ */}

        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111923]">
          <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:p-9">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <ShieldCheck size={14} />
                Pharmacy operations centre
              </div>

              <h2 className="mt-5 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                {isFreshStart
                  ? "Let's set up your pharmacy."
                  : "Everything important, at a glance."}
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
                {isFreshStart
                  ? "Start with your medicine catalogue, inventory and sales records. Your overview will update as you enter real pharmacy data."
                  : "Review business activity, identify stock risks and move directly to the sections that need your attention."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isFreshStart ? "/medicines" : "/inventory")
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#07110d] transition-colors hover:bg-emerald-300"
                >
                  {isFreshStart ? (
                    <Plus size={17} />
                  ) : (
                    <Boxes size={17} />
                  )}

                  {isFreshStart
                    ? "Set up medicines"
                    : "Review inventory"}

                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/sales")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-[#171e29] px-5 py-3 text-sm font-medium text-white transition-colors hover:border-white/[0.18] hover:bg-[#1c2532]"
                >
                  <ShoppingCart size={16} />
                  Open sales
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck
                    size={15}
                    className="text-emerald-300"
                  />
                  Role-protected workspace
                </span>

                <span className="inline-flex items-center gap-2">
                  <Activity size={15} className="text-sky-300" />
                  Database-connected overview
                </span>
              </div>
            </div>

            {/* Workspace summary */}

            <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0b1017] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Workspace status
                  </p>

                  <p className="mt-1 text-lg font-semibold text-white">
                    {isFreshStart ? "Getting started" : "Overview ready"}
                  </p>
                </div>

                <IconBox
                  size="lg"
                  className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                >
                  <Pill size={23} />
                </IconBox>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">
                    Setup checklist
                  </span>

                  <span className="font-semibold text-emerald-300">
                    {completedSteps}/{setupSteps.length} completed
                  </span>
                </div>

                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"
                  role="progressbar"
                  aria-valuenow={setupProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Pharmacy setup progress"
                >
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${setupProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-[#121923] p-4">
                  <Package size={18} className="text-sky-300" />

                  <p className="mt-3 text-2xl font-bold text-white">
                    {formatNumber(totalMedicines)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Medicines
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#121923] p-4">
                  <ShoppingCart
                    size={18}
                    className="text-violet-300"
                  />

                  <p className="mt-3 text-2xl font-bold text-white">
                    {formatNumber(monthlyCount)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Monthly sales
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#121923] p-3">
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />

                <p className="text-xs leading-5 text-slate-400">
                  {isFreshStart
                    ? "Your dashboard is ready for your first records."
                    : "Your overview reflects the records returned by your dashboard API."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
            First-time Setup Checklist
        ================================================ */}

        {isFreshStart && (
          <section
            className={`overflow-hidden rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND}`}
          >
            <div className="border-b border-white/[0.06] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    First-time setup
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-white">
                    Start with the essentials
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Use these steps to begin building your pharmacy records.
                  </p>
                </div>

                <div className="shrink-0 rounded-xl border border-white/[0.08] bg-[#0b1017] px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Setup progress
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {setupProgress}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              {setupSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className={`flex min-w-0 flex-col justify-between gap-5 p-5 sm:p-6 ${
                      index % 2 === 0
                        ? "sm:border-r sm:border-white/[0.06]"
                        : ""
                    } ${
                      index < 2 ? "border-b border-white/[0.06]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconBox
                        size="lg"
                        className={
                          step.completed
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-violet-500/10 text-violet-300"
                        }
                      >
                        {step.completed ? (
                          <CheckCircle2 size={21} />
                        ) : (
                          <Icon size={21} />
                        )}
                      </IconBox>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">
                            {step.title}
                          </h3>

                          {step.completed && (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Started
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(step.path)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.08] bg-[#171c27] px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-violet-500/30 hover:text-white"
                    >
                      {step.action}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================
            Performance Statistics
        ================================================ */}

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Performance overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Key figures from your recorded pharmacy activity.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 self-start text-xs text-slate-500 sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Dashboard data
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <MetricCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* ================================================
            Sales and Inventory
        ================================================ */}

        <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-5">
          {/* Sales Overview */}

          <div
            className={`min-w-0 rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND} p-5 sm:p-6 xl:col-span-3`}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <SectionHeading
                icon={TrendingUp}
                title="Sales activity"
                description="Completed transaction summaries"
              />

              <SectionLink onClick={() => navigate("/sales")}>
                View sales
              </SectionLink>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-[#0d1917] p-5 sm:p-6">
              <p className="text-sm text-slate-400">
                Revenue this month
              </p>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <p className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {formatCurrency(monthlyRevenue)}
                </p>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                  <Activity size={13} />
                  Recorded revenue
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Based on the monthly revenue value returned by PharmaCore.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c1017] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-400">
                    Today's transactions
                  </p>

                  <ShoppingCart
                    size={17}
                    className="text-emerald-300"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-white">
                  {formatNumber(todayCount)}
                </p>

                <p className="mt-1 break-words text-xs text-slate-500">
                  {formatCurrency(todayRevenue)} revenue today
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0c1017] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-400">
                    This month's transactions
                  </p>

                  <CalendarDays
                    size={17}
                    className="text-violet-300"
                  />
                </div>

                <p className="mt-3 text-2xl font-bold text-white">
                  {formatNumber(monthlyCount)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Sales recorded this month
                </p>
              </div>
            </div>

            {monthlyCount === 0 && (
              <div className="mt-4 rounded-2xl border border-dashed border-white/[0.12] bg-[#0c1017]">
                <EmptyState
                  icon={ShoppingCart}
                  title="Your sales activity will appear here"
                  description="When your pharmacy records sales, this section will display the totals returned by your dashboard API."
                  action="Go to sales"
                  onAction={() => navigate("/sales")}
                />
              </div>
            )}
          </div>

          {/* Inventory Health */}

          <div
            className={`min-w-0 rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND} p-5 sm:p-6 xl:col-span-2`}
          >
            <SectionHeading
              icon={Boxes}
              title="Inventory health"
              description="Stock and expiry overview"
              iconClass="bg-sky-500/10 text-sky-300"
            />

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0c1017] p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <IconBox
                    size="sm"
                    className="bg-sky-500/10 text-sky-300"
                  >
                    <Pill size={17} />
                  </IconBox>

                  <span className="text-sm text-slate-300">
                    Medicines
                  </span>
                </div>

                <span className="shrink-0 font-semibold text-white">
                  {formatNumber(totalMedicines)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0c1017] p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <IconBox
                    size="sm"
                    className="bg-violet-500/10 text-violet-300"
                  >
                    <Package size={17} />
                  </IconBox>

                  <span className="text-sm text-slate-300">
                    Total units
                  </span>
                </div>

                <span className="shrink-0 font-semibold text-white">
                  {formatNumber(totalUnits)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-3.5 text-left transition-colors hover:bg-amber-500/[0.09]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <IconBox
                    size="sm"
                    className="bg-amber-500/10 text-amber-300"
                  >
                    <AlertTriangle size={17} />
                  </IconBox>

                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">
                      Low-stock items
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Review reorder levels
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-lg font-bold text-amber-300">
                  {formatNumber(lowStockCount)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-3.5 text-left transition-colors hover:bg-red-500/[0.09]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <IconBox
                    size="sm"
                    className="bg-red-500/10 text-red-300"
                  >
                    <XCircle size={17} />
                  </IconBox>

                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">
                      Out of stock
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Items with zero stock
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-lg font-bold text-red-300">
                  {formatNumber(outOfStockCount)}
                </span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-500/10 bg-[#17150f] p-3">
                <p className="text-xs leading-5 text-slate-400">
                  Expiring batches
                </p>

                <p className="mt-2 text-xl font-bold text-amber-300">
                  {formatNumber(expiringBatchCount)}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Within the backend's configured window
                </p>
              </div>

              <div className="rounded-xl border border-red-500/10 bg-[#1a1013] p-3">
                <p className="text-xs leading-5 text-slate-400">
                  Expired batches
                </p>

                <p className="mt-2 text-xl font-bold text-red-300">
                  {formatNumber(expiredBatchCount)}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Require attention
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/inventory")}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#171c27] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/[0.14] hover:text-white"
            >
              Open inventory
              <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* ================================================
            Prescription Overview
        ================================================ */}

        <section
          className={`overflow-hidden rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND}`}
        >
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:p-6">
            <SectionHeading
              icon={FileText}
              title="Prescription overview"
              description="Monitor prescription workflow activity"
              iconClass="bg-violet-500/10 text-violet-300"
            />

            <SectionLink onClick={() => navigate("/prescriptions")}>
              Manage prescriptions
            </SectionLink>
          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
            {prescriptionStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <button
                  key={stat.title}
                  type="button"
                  onClick={() => navigate("/prescriptions")}
                  className="rounded-2xl border border-white/[0.06] bg-[#0c1017] p-4 text-left transition-colors hover:border-white/[0.14] hover:bg-[#121823]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">
                      {stat.title}
                    </p>

                    <IconBox size="sm" className={stat.iconClass}>
                      <Icon size={17} />
                    </IconBox>
                  </div>

                  <p className="mt-4 text-2xl font-bold text-white">
                    {formatNumber(stat.value)}
                  </p>
                </button>
              );
            })}
          </div>

          {prescriptionTotal === 0 && (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="rounded-2xl border border-dashed border-white/[0.10]">
                <EmptyState
                  icon={FileText}
                  title="No prescription records yet"
                  description="Prescription statistics will appear here when records are available."
                  action="Open prescriptions"
                  onAction={() => navigate("/prescriptions")}
                />
              </div>
            </div>
          )}
        </section>

        {/* ================================================
            Recent Sales
        ================================================ */}

        <section
          className={`overflow-hidden rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND}`}
        >
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:p-6">
            <SectionHeading
              icon={ShoppingCart}
              title="Recent sales"
              description="Latest transactions returned by your dashboard"
              iconClass="bg-emerald-500/10 text-emerald-300"
            />

            <SectionLink onClick={() => navigate("/sales")}>
              All transactions
            </SectionLink>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-dashed border-white/[0.10]">
                <EmptyState
                  icon={ShoppingCart}
                  title="No recent sales to display"
                  description="Once transactions are recorded, the latest sales will appear in this section."
                  action="Record or view sales"
                  onAction={() => navigate("/sales")}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Mobile transaction cards */}

              <div className="space-y-3 p-4 sm:hidden">
                {recentSales.map((sale, index) => {
                  const key =
                    sale.id ||
                    sale.saleNumber ||
                    sale.reference ||
                    `sale-${index}`;

                  const status = sale.status || "Unknown";

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => navigate("/sales")}
                      className="w-full rounded-2xl border border-white/[0.06] bg-[#0c1017] p-4 text-left transition-colors hover:border-white/[0.12]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {getSaleReference(sale)}
                          </p>

                          <p className="mt-1 break-words text-xs text-slate-400">
                            {getCustomerName(sale)}
                          </p>
                        </div>

                        <StatusBadge status={status} />
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/[0.06] pt-3">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Date
                          </p>

                          <p className="mt-1 text-xs text-slate-300">
                            {formatDateTime(getSaleDate(sale))}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] text-slate-500">
                            Total
                          </p>

                          <p className="mt-1 break-words text-sm font-semibold text-white">
                            {formatCurrency(getSaleAmount(sale))}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop transaction table */}

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-[#0c1017]">
                      <th className="px-6 py-4 text-xs font-medium text-slate-500">
                        Sale reference
                      </th>

                      <th className="px-6 py-4 text-xs font-medium text-slate-500">
                        Customer
                      </th>

                      <th className="px-6 py-4 text-xs font-medium text-slate-500">
                        Date
                      </th>

                      <th className="px-6 py-4 text-xs font-medium text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-500">
                        Total
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-medium text-slate-500">
                        View
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentSales.map((sale, index) => {
                      const key =
                        sale.id ||
                        sale.saleNumber ||
                        sale.reference ||
                        `sale-${index}`;

                      return (
                        <tr
                          key={key}
                          className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015]"
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-white">
                              {getSaleReference(sale)}
                            </span>
                          </td>

                          <td className="max-w-[200px] px-6 py-4">
                            <span className="block truncate text-sm text-slate-300">
                              {getCustomerName(sale)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">
                            {formatDateTime(getSaleDate(sale))}
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge status={sale.status} />
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-white">
                            {formatCurrency(getSaleAmount(sale))}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => navigate("/sales")}
                              aria-label={`View ${getSaleReference(sale)}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-[#151a24] text-slate-400 transition-colors hover:border-violet-500/30 hover:text-violet-300"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <p className="text-xs text-slate-500">
                  Showing {formatNumber(recentSales.length)} recent
                  transaction{recentSales.length === 1 ? "" : "s"}
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/sales")}
                  className="inline-flex min-h-9 items-center justify-center gap-2 self-start text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200 sm:self-auto"
                >
                  Open sales history
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </section>

        {/* ================================================
            Inventory Attention
        ================================================ */}

        {(lowStockCount > 0 ||
          outOfStockCount > 0 ||
          expiredBatchCount > 0 ||
          expiringBatchCount > 0) && (
          <section
            className={`rounded-3xl ${PANEL_BORDER} ${PANEL_BACKGROUND} p-5 sm:p-6`}
          >
            <SectionHeading
              icon={AlertTriangle}
              title="Items needing attention"
              description="Review inventory risks before they affect operations"
              iconClass="bg-amber-500/10 text-amber-300"
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Low stock",
                  value: lowStockCount,
                  description: "Review reorder levels",
                  className:
                    "border-amber-500/15 bg-amber-500/[0.04] text-amber-300"
                },
                {
                  title: "Out of stock",
                  value: outOfStockCount,
                  description: "No available stock",
                  className:
                    "border-red-500/15 bg-red-500/[0.04] text-red-300"
                },
                {
                  title: "Expiring batches",
                  value: expiringBatchCount,
                  description: "Check expiry dates",
                  className:
                    "border-orange-500/15 bg-orange-500/[0.04] text-orange-300"
                },
                {
                  title: "Expired batches",
                  value: expiredBatchCount,
                  description: "Review immediately",
                  className:
                    "border-red-500/15 bg-red-500/[0.04] text-red-300"
                }
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate("/inventory")}
                  className={`rounded-2xl border p-4 text-left transition-colors hover:bg-white/[0.03] ${item.className}`}
                >
                  <p className="text-sm font-medium">{item.title}</p>

                  <p className="mt-3 text-2xl font-bold">
                    {formatNumber(item.value)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/inventory")}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#171c27] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/[0.14] hover:text-white"
            >
              Review inventory
              <ArrowRight size={15} />
            </button>
          </section>
        )}

        {/* ================================================
            Footer
        ================================================ */}

        <footer className="flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-5 text-xs text-slate-600 sm:flex-row sm:items-center">
          <p>PharmaCore Pharmacy Management System</p>

          <p className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Overview workspace
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
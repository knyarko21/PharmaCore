
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  XCircle
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";

// ======================================================
// Icon Box
// ======================================================

const IconBox = ({ children, className = "", size = "md" }) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
};

// ======================================================
// Purchases
// ======================================================

const Purchases = () => {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ====================================================
  // Currency Formatting
  // ====================================================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount) || 0);
  };

  // ====================================================
  // Date Formatting
  // ====================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(parsedDate);
  };

  // ====================================================
  // Fetch Purchases
  // ====================================================

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/purchases");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to load purchases."
        );
      }

      setPurchases(
        Array.isArray(response.data.purchases)
          ? response.data.purchases
          : []
      );
    } catch (error) {
      console.error("Purchases fetch error:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load purchases."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // ====================================================
  // Filter Purchases
  // ====================================================

  const filteredPurchases = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const purchaseNumber = String(
        purchase.purchaseNumber || ""
      ).toLowerCase();

      const supplierName = String(
        purchase.supplier?.name || ""
      ).toLowerCase();

      const matchesSearch =
        !search ||
        purchaseNumber.includes(search) ||
        supplierName.includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        purchase.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  // ====================================================
  // Purchase Summary
  // ====================================================

  const summary = useMemo(() => {
    const total = purchases.length;

    const pending = purchases.filter(
      (purchase) => purchase.status === "pending"
    ).length;

    const received = purchases.filter(
      (purchase) => purchase.status === "received"
    ).length;

    const cancelled = purchases.filter(
      (purchase) => purchase.status === "cancelled"
    ).length;

    const totalSpent = purchases
      .filter((purchase) => purchase.status === "received")
      .reduce((total, purchase) => {
        return total + Number(purchase.totalAmount || 0);
      }, 0);

    return {
      total,
      pending,
      received,
      cancelled,
      totalSpent
    };
  }, [purchases]);

  // ====================================================
  // Status Styling
  // ====================================================

  const getStatusClasses = (status) => {
    switch (status) {
      case "received":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

      case "pending":
        return "border-amber-500/20 bg-amber-500/10 text-amber-400";

      case "cancelled":
        return "border-red-500/20 bg-red-500/10 text-red-400";

      default:
        return "border-white/[0.08] bg-white/[0.03] text-zinc-400";
    }
  };

  // ====================================================
  // Status Icons
  // ====================================================

  const getStatusIcon = (status) => {
    switch (status) {
      case "received":
        return <CheckCircle2 size={14} />;

      case "pending":
        return <Clock3 size={14} />;

      case "cancelled":
        return <XCircle size={14} />;

      default:
        return <AlertTriangle size={14} />;
    }
  };

  // ====================================================
  // Status Labels
  // ====================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case "received":
        return "Received";

      case "pending":
        return "Pending";

      case "cancelled":
        return "Cancelled";

      default:
        return status || "Unknown";
    }
  };

  // ====================================================
  // Loading Screen
  // ====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-[#111016]">
            <ShoppingCart
              size={28}
              className="text-violet-400"
            />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />

            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading purchases
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Fetching procurement records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // Error Screen
  // ====================================================

  if (error) {
    return (
      <div className="min-h-full bg-[#08080a] px-1 py-2 text-zinc-100">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-red-500/20 bg-[#101014] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <IconBox
              size="lg"
              className="bg-red-500/10 text-red-400 ring-red-500/20"
            >
              <AlertTriangle size={22} />
            </IconBox>

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-red-300">
                Unable to load purchases
              </h2>

              <p className="mt-1 break-words text-sm text-red-400/80">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchPurchases}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
              >
                <RefreshCw size={16} />

                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // Main Render
  // ====================================================

  return (
    <div className="relative isolate min-h-full overflow-hidden bg-[#08080a] text-zinc-100">
      {/* Stable background for mobile scrolling */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#08080a]" />

      <div className="space-y-8 pb-10">
        {/* ==================================================
            Page Header
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-violet-400">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
                <ShoppingCart size={13} />
              </span>

              <span>Procurement</span>
            </div>

            <h1 className="flex flex-wrap items-center gap-2.5 text-3xl font-bold tracking-tight text-white">
              Purchases

              <Sparkles
                size={20}
                className="text-violet-400/70"
              />
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Manage medicine purchases, suppliers, receiving and
              incoming inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchPurchases}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#111114] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.15] hover:bg-[#18181c] hover:text-white"
            >
              <RefreshCw
                size={16}
                className="transition-transform duration-500 group-hover:rotate-180"
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() => navigate("/purchases/create")}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-shadow hover:shadow-xl hover:shadow-violet-600/30 active:scale-[0.98]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <Plus
                size={17}
                className="relative"
              />

              <span className="relative">
                New Purchase
              </span>
            </button>
          </div>
        </div>

        {/* ==================================================
            Summary Cards
        ================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Purchases"
            value={summary.total}
            icon={ShoppingCart}
            hint="All purchases"
            accent="violet"
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
            icon={Clock3}
            hint="Awaiting receipt"
            accent="amber"
          />

          <SummaryCard
            label="Received"
            value={summary.received}
            icon={CheckCircle2}
            hint="Stock received"
            accent="emerald"
          />

          <SummaryCard
            label="Total Spent"
            value={formatCurrency(summary.totalSpent)}
            icon={Package}
            hint="Received purchases"
            accent="sky"
          />
        </div>

        {/* ==================================================
            Purchase Orders
        ================================================== */}

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
          {/* Search and Filter Header */}

          <div className="flex flex-col gap-4 border-b border-white/[0.06] bg-[#111114] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Purchase Orders
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Track medicine orders and incoming stock.
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                  type="text"
                  aria-label="Search purchases"
                  placeholder="Search purchase or supplier..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-[#08080a] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 sm:w-72"
                />
              </div>

              <select
                aria-label="Filter purchases by status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#08080a] px-4 py-2.5 text-sm text-zinc-300 outline-none transition-colors focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 sm:w-auto"
              >
                <option
                  value="all"
                  className="bg-[#111114]"
                >
                  All Statuses
                </option>

                <option
                  value="pending"
                  className="bg-[#111114]"
                >
                  Pending
                </option>

                <option
                  value="received"
                  className="bg-[#111114]"
                >
                  Received
                </option>

                <option
                  value="cancelled"
                  className="bg-[#111114]"
                >
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          {/* Empty State */}

          {filteredPurchases.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center px-6 py-12">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-[#15121d] text-violet-400">
                  <ShoppingCart size={26} />
                </div>

                <p className="mt-4 font-medium text-zinc-300">
                  No purchases found
                </p>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {purchases.length === 0
                    ? "Create your first purchase order to start tracking incoming stock."
                    : "Try changing your search or status filter."}
                </p>

                {purchases.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/purchases/create")}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
                  >
                    <Plus size={16} />

                    New Purchase
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Purchase Table */

            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#111114] text-left">
                    <th className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Purchase
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Supplier
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Date
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Items
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Amount
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPurchases.map((purchase) => {
                    const itemCount = Array.isArray(purchase.items)
                      ? purchase.items.length
                      : 0;

                    return (
                      <tr
                        key={purchase.id}
                        className="transition-colors hover:bg-white/[0.02]"
                      >
                        {/* Purchase Number */}

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <IconBox
                              size="sm"
                              className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                            >
                              <ShoppingCart size={17} />
                            </IconBox>

                            <div>
                              <p className="text-sm font-medium text-white">
                                {purchase.purchaseNumber ||
                                  `Purchase #${purchase.id}`}
                              </p>

                              <p className="mt-1 text-xs text-zinc-600">
                                Purchase #{purchase.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Supplier */}

                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-300">
                            {purchase.supplier?.name ||
                              "Unknown Supplier"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {purchase.supplier?.phone || "—"}
                          </p>
                        </td>

                        {/* Purchase Date */}

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-zinc-600"
                            />

                            <span className="text-sm text-zinc-400">
                              {formatDate(purchase.purchaseDate)}
                            </span>
                          </div>
                        </td>

                        {/* Items */}

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package
                              size={15}
                              className="shrink-0 text-zinc-600"
                            />

                            <span className="text-sm text-zinc-400">
                              {itemCount}{" "}
                              {itemCount === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </td>

                        {/* Amount */}

                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(purchase.totalAmount)}
                          </span>
                        </td>

                        {/* Status */}

                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                              purchase.status
                            )}`}
                          >
                            {getStatusIcon(purchase.status)}

                            {getStatusLabel(purchase.status)}
                          </span>
                        </td>

                        {/* View Action */}

                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/purchases/${purchase.id}`)
                            }
                            aria-label={`View purchase ${purchase.purchaseNumber || purchase.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151518] px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                          >
                            <Eye size={14} />

                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}

          <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#101014] px-5 py-4 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Showing {filteredPurchases.length} of {purchases.length}{" "}
              purchases
            </span>

            <span>
              {summary.cancelled} cancelled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ======================================================
// Summary Card
// ======================================================

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  hint,
  accent = "violet"
}) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.12]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },

    amber: {
      gradient: "from-amber-500/[0.12]",
      icon: "bg-amber-500/10 text-amber-400 ring-amber-500/20"
    },

    emerald: {
      gradient: "from-emerald-500/[0.12]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    },

    sky: {
      gradient: "from-sky-500/[0.12]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101014] p-5 shadow-lg shadow-black/20 transition-colors duration-200 hover:border-white/[0.15]">
      {/* Subtle accent at the top */}

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <IconBox
          size="lg"
          className={style.icon}
        >
          <Icon size={21} />
        </IconBox>

        <span className="text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          {hint}
        </span>
      </div>

      <div className="relative mt-5">
        <p className="text-sm text-zinc-500">
          {label}
        </p>

        <p className="mt-2 break-words text-2xl font-bold tracking-tight text-white">
          {value}
        </p>
      </div>
    </div>
  );
};

export default Purchases;
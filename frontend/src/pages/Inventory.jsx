
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

// =========================================================
// Helpers
// =========================================================

const formatCurrency = (value) =>
  `GH₵${Number(value ?? 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("en-GH");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// =========================================================
// Reusable Icon Box
// =========================================================

const IconBox = ({
  children,
  className = "",
  size = "md",
}) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-11 w-11 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
};

// =========================================================
// Summary Card
// =========================================================

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  accent = "violet",
}) => {
  const accents = {
    violet: {
      background: "bg-violet-500/[0.06]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    },
    sky: {
      background: "bg-sky-500/[0.06]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    },
    emerald: {
      background: "bg-emerald-500/[0.06]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    },
    fuchsia: {
      background: "bg-fuchsia-500/[0.06]",
      icon: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20",
    },
  };

  const style = accents[accent] || accents.violet;

  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] ${style.background} bg-[#101014] p-4 transition-colors duration-200 hover:border-white/[0.14] sm:p-5`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-500">{label}</p>

          <p className="mt-2 break-words text-xl font-bold leading-tight text-white sm:text-2xl">
            {value}
          </p>
        </div>

        <IconBox className={style.icon}>
          <Icon size={20} />
        </IconBox>
      </div>
    </div>
  );
};

// =========================================================
// Batch Card
// =========================================================

const BatchCard = ({
  batch,
  expiryDays,
  onAdjust,
}) => {
  const daysUntilExpiry = Number(batch.daysUntilExpiry);

  const isExpired =
    batch.isExpired === true ||
    (Number.isFinite(daysUntilExpiry) &&
      daysUntilExpiry < 0);

  const isExpiringSoon =
    !isExpired &&
    Number.isFinite(daysUntilExpiry) &&
    daysUntilExpiry <= expiryDays;

  const status = isExpired
    ? {
        label: "Expired",
        className: "bg-red-500/10 text-red-400",
        borderClass: "border-red-500/20 bg-[#171013]",
      }
    : isExpiringSoon
      ? {
          label: "Expiring Soon",
          className: "bg-amber-500/10 text-amber-400",
          borderClass: "border-amber-500/20 bg-[#17140e]",
        }
      : {
          label: "Valid",
          className: "bg-emerald-500/10 text-emerald-400",
          borderClass: "border-white/[0.08] bg-[#111115]",
        };

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 transition-colors ${status.borderClass}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Boxes
              size={16}
              className={`shrink-0 ${
                isExpired
                  ? "text-red-400"
                  : isExpiringSoon
                    ? "text-amber-400"
                    : "text-violet-400"
              }`}
            />

            <p className="break-words font-semibold text-white">
              {batch.batchNumber || "Unknown Batch"}
            </p>
          </div>

          <p className="mt-1 break-all text-xs text-zinc-600">
            Batch ID: {batch.id}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="min-w-0">
          <p className="text-[11px] text-zinc-600">Quantity</p>
          <p className="mt-1 break-words font-semibold text-white">
            {formatNumber(batch.quantity)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-zinc-600">Buy Price</p>
          <p className="mt-1 break-words text-sm text-zinc-300">
            {formatCurrency(batch.purchasePrice)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-zinc-600">Sell Price</p>
          <p className="mt-1 break-words text-sm text-zinc-300">
            {formatCurrency(batch.sellingPrice)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] text-zinc-600">Supplier</p>
          <p className="mt-1 break-words text-sm text-zinc-300">
            {batch.supplier?.name || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-[#0b0b0e] px-3 py-2">
          <CalendarDays
            size={15}
            className={`shrink-0 ${
              isExpired
                ? "text-red-400"
                : isExpiringSoon
                  ? "text-amber-400"
                  : "text-zinc-500"
            }`}
          />

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">
              Expiry
            </p>
            <p className="break-words text-xs text-zinc-300">
              {formatDate(batch.expiryDate)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-[#0b0b0e] px-3 py-2">
          <Clock3
            size={15}
            className="shrink-0 text-zinc-500"
          />

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-600">
              Expiry Status
            </p>

            <p className="break-words text-xs text-zinc-300">
              {!Number.isFinite(daysUntilExpiry)
                ? "Date unavailable"
                : isExpired
                  ? `${Math.abs(daysUntilExpiry)} days ago`
                  : `${daysUntilExpiry} days remaining`}
            </p>
          </div>
        </div>
      </div>

      {batch.manufactureDate && (
        <div className="mt-3 text-xs text-zinc-600">
          Manufactured:{" "}
          <span className="text-zinc-400">
            {formatDate(batch.manufactureDate)}
          </span>
        </div>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <button
          type="button"
          onClick={() => onAdjust(batch)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 transition-colors hover:border-violet-500/40 hover:bg-violet-500/15 hover:text-white sm:w-auto"
        >
          <Pencil size={15} />
          Adjust Stock
        </button>
      </div>
    </div>
  );
};

// =========================================================
// Inventory Page
// =========================================================

const Inventory = () => {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [expiredBatches, setExpiredBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [expiryDays, setExpiryDays] = useState(30);

  const [expandedMedicine, setExpandedMedicine] = useState(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [adjustmentForm, setAdjustmentForm] = useState({
    quantityChange: "",
    reason: "",
  });

  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState("");

  // =======================================================
  // Stock Status
  // =======================================================

  const getStockStatus = (item) => {
    if (item.stockStatus === "out_of_stock") {
      return {
        label: "Out of Stock",
        className:
          "border-red-500/20 bg-red-500/10 text-red-400",
        icon: PackageX,
      };
    }

    if (
      item.stockStatus === "low_stock" ||
      item.stockStatus === "low"
    ) {
      return {
        label: "Low Stock",
        className:
          "border-amber-500/20 bg-amber-500/10 text-amber-400",
        icon: AlertTriangle,
      };
    }

    return {
      label: "Healthy",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      icon: PackageCheck,
    };
  };

  // =======================================================
  // Fetch Inventory Data
  // =======================================================

  const fetchInventory = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          summaryResponse,
          lowStockResponse,
          expiringResponse,
          expiredResponse,
        ] = await Promise.all([
          api.get("/inventory/summary"),
          api.get("/inventory/low-stock"),
          api.get(`/inventory/expiring?days=${expiryDays}`),
          api.get("/inventory/expired"),
        ]);

        const summaryData =
          summaryResponse?.data?.summary ??
          summaryResponse?.data?.data ??
          summaryResponse?.data ??
          null;

        const lowStockData =
          lowStockResponse?.data?.medicines ??
          lowStockResponse?.data?.data ??
          lowStockResponse?.data?.lowStock ??
          lowStockResponse?.data ??
          [];

        const expiringData =
          expiringResponse?.data?.batches ??
          expiringResponse?.data?.data ??
          expiringResponse?.data?.expiringBatches ??
          expiringResponse?.data ??
          [];

        const expiredData =
          expiredResponse?.data?.batches ??
          expiredResponse?.data?.data ??
          expiredResponse?.data?.expiredBatches ??
          expiredResponse?.data ??
          [];

        setSummary(summaryData);

        setLowStock(
          Array.isArray(lowStockData) ? lowStockData : []
        );

        setExpiringBatches(
          Array.isArray(expiringData) ? expiringData : []
        );

        setExpiredBatches(
          Array.isArray(expiredData) ? expiredData : []
        );
      } catch (err) {
        console.error("Failed to load inventory:", err);

        setError(
          err?.response?.data?.message ||
            "Failed to load inventory data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [expiryDays]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fetchInventory();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [fetchInventory]);

  // =======================================================
  // Search and Filtering
  // =======================================================

  const inventory = useMemo(() => {
    return Array.isArray(summary?.inventory)
      ? summary.inventory
      : [];
  }, [summary]);

  const filteredInventory = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return inventory.filter((item) => {
      const medicineName = item.medicineName || "";
      const genericName = item.genericName || "";
      const brandName = item.brandName || "";
      const sku = item.sku || "";

      const matchesSearch =
        !search ||
        medicineName.toLowerCase().includes(search) ||
        genericName.toLowerCase().includes(search) ||
        brandName.toLowerCase().includes(search) ||
        sku.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      if (stockFilter === "all") return true;

      if (stockFilter === "healthy") {
        return (
          item.stockStatus === "in_stock" ||
          item.stockStatus === "healthy"
        );
      }

      if (stockFilter === "low_stock") {
        return (
          item.stockStatus === "low_stock" ||
          item.stockStatus === "low"
        );
      }

      if (stockFilter === "out_of_stock") {
        return item.stockStatus === "out_of_stock";
      }

      return true;
    });
  }, [inventory, searchTerm, stockFilter]);

  const toggleMedicine = (medicineId) => {
    setExpandedMedicine((current) =>
      current === medicineId ? null : medicineId
    );
  };

  // =======================================================
  // Batch Details
  // =======================================================

  const renderBatchDetails = (item) => {
    const batches = Array.isArray(item.batches)
      ? item.batches
      : [];

    const validBatches = batches
      .filter((batch) => {
        const days = Number(batch.daysUntilExpiry);

        return (
          batch.isExpired !== true &&
          Number.isFinite(days) &&
          days >= 0
        );
      })
      .sort(
        (a, b) =>
          Number(a.daysUntilExpiry) -
          Number(b.daysUntilExpiry)
      );

    const nextBatchId = validBatches[0]?.id;

    return (
      <div className="border-t border-white/[0.06] bg-[#0b0b0e] px-3 py-4 sm:px-5 sm:py-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Batch Details
            </h3>

            <p className="mt-1 text-xs leading-5 text-zinc-600">
              Stock is managed at batch level. Prioritize
              earlier-expiring valid batches.
            </p>
          </div>

          <span className="w-fit rounded-full border border-white/[0.06] bg-[#151519] px-2.5 py-1 text-xs text-zinc-500">
            {formatNumber(batches.length)} batch
            {batches.length === 1 ? "" : "es"}
          </span>
        </div>

        {batches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.12] p-6 text-center">
            <PackageX
              size={25}
              className="mx-auto text-zinc-700"
            />
            <p className="mt-2 text-sm text-zinc-500">
              No batches found.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {batches.map((batch) => (
              <div key={batch.id} className="min-w-0">
                <BatchCard
                  batch={batch}
                  expiryDays={expiryDays}
                  onAdjust={openAdjustment}
                />

                {batch.id === nextBatchId &&
                  batch.isExpired !== true &&
                  Number(batch.daysUntilExpiry) >= 0 && (
                    <p className="mt-2 px-2 text-[10px] font-medium uppercase tracking-wider text-violet-400">
                      FEFO priority
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // =======================================================
  // Stock Adjustment
  // =======================================================

  const openAdjustment = (batch) => {
    setSelectedBatch(batch);

    setAdjustmentForm({
      quantityChange: "",
      reason: "",
    });

    setAdjustmentError("");
    setShowAdjustment(true);
  };

  const closeAdjustment = () => {
    if (adjusting) return;

    setShowAdjustment(false);
    setSelectedBatch(null);

    setAdjustmentForm({
      quantityChange: "",
      reason: "",
    });

    setAdjustmentError("");
  };

  const handleAdjustmentChange = (event) => {
    const { name, value } = event.target;

    setAdjustmentForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (adjustmentError) {
      setAdjustmentError("");
    }
  };

  const handleAdjustment = async (event) => {
    event.preventDefault();

    if (!selectedBatch) return;

    const quantityChange = Number(
      adjustmentForm.quantityChange
    );

    const reason = adjustmentForm.reason.trim();

    if (
      adjustmentForm.quantityChange.trim() === "" ||
      !Number.isInteger(quantityChange)
    ) {
      setAdjustmentError(
        "Quantity change must be a whole number."
      );
      return;
    }

    if (quantityChange === 0) {
      setAdjustmentError(
        "Quantity change cannot be zero."
      );
      return;
    }

    if (reason.length < 3) {
      setAdjustmentError(
        "Please provide a reason for the adjustment."
      );
      return;
    }

    const currentQuantity = Number(
      selectedBatch.quantity ?? 0
    );

    if (currentQuantity + quantityChange < 0) {
      setAdjustmentError(
        "This adjustment would make the batch quantity negative."
      );
      return;
    }

    try {
      setAdjusting(true);
      setAdjustmentError("");

      await api.post("/inventory/adjust", {
        batchId: selectedBatch.id,
        quantityChange,
        reason,
      });

      setShowAdjustment(false);
      setSelectedBatch(null);

      setAdjustmentForm({
        quantityChange: "",
        reason: "",
      });

      await fetchInventory(true);
    } catch (err) {
      console.error("Failed to adjust stock:", err);

      setAdjustmentError(
        err?.response?.data?.message ||
          "Failed to adjust stock."
      );
    } finally {
      setAdjusting(false);
    }
  };

  // =======================================================
  // Loading State
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-[#15101e]">
            <Boxes size={28} className="text-violet-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading inventory
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Preparing your stock data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================
  // Error State
  // =======================================================

  if (error && !summary) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#101014] p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
            <AlertTriangle size={24} />
          </div>

          <h2 className="text-lg font-semibold text-white">
            Unable to load inventory
          </h2>

          <p className="mt-2 break-words text-sm text-zinc-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() => fetchInventory()}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =======================================================
  // Main Inventory Page
  // =======================================================

  return (
    <div className="relative min-h-full min-w-0 overflow-x-clip bg-[#08080a] text-zinc-100">
      <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-5 pb-10 sm:space-y-6">
        {/* Page Header */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <IconBox
              size="lg"
              className="bg-[#191126] text-violet-400 ring-violet-500/20"
            >
              <Boxes size={23} />
            </IconBox>

            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-white">
                Inventory
                <Sparkles
                  size={18}
                  className="text-violet-400/70"
                />
              </h1>

              <p className="mt-1 text-sm leading-5 text-zinc-500">
                Monitor stock, batches, expiry dates and inventory value.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchInventory(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#121216] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/[0.15] hover:bg-[#19191f] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-[#19140c] px-4 py-3 text-sm text-amber-300"
          >
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span className="break-words">{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-5">
          <SummaryCard
            label="Total Medicines"
            value={formatNumber(summary?.totalMedicines)}
            icon={Boxes}
            accent="violet"
          />

          <SummaryCard
            label="Total Units"
            value={formatNumber(summary?.totalUnits)}
            icon={Package}
            accent="sky"
          />

          <SummaryCard
            label="Inventory Value"
            value={formatCurrency(summary?.totalInventoryValue)}
            icon={CircleDollarSign}
            accent="emerald"
          />

          <SummaryCard
            label="Retail Value"
            value={formatCurrency(summary?.totalRetailValue)}
            icon={TrendingUp}
            accent="fuchsia"
          />

          <SummaryCard
            label="Potential Profit"
            value={formatCurrency(summary?.potentialProfit)}
            icon={TrendingUp}
            accent="violet"
          />
        </div>

        {/* Stock Alerts */}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-amber-500/20 bg-[#17140e] p-4 transition-colors hover:border-amber-500/30 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-amber-300/70">
                  Low Stock
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-300">
                  {formatNumber(
                    summary?.lowStockCount ?? lowStock.length
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-300/50">
                  Needs replenishment
                </p>
              </div>

              <IconBox className="bg-amber-500/10 text-amber-400 ring-amber-500/20">
                <AlertTriangle size={21} />
              </IconBox>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-red-500/20 bg-[#190f12] p-4 transition-colors hover:border-red-500/30 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-red-300/70">
                  Out of Stock
                </p>
                <p className="mt-1 text-2xl font-bold text-red-300">
                  {formatNumber(summary?.outOfStockCount)}
                </p>
                <p className="mt-1 text-xs text-red-300/50">
                  No usable stock
                </p>
              </div>

              <IconBox className="bg-red-500/10 text-red-400 ring-red-500/20">
                <PackageX size={21} />
              </IconBox>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-orange-500/20 bg-[#19130e] p-4 transition-colors hover:border-orange-500/30 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-orange-300/70">
                  Expiring Soon
                </p>
                <p className="mt-1 text-2xl font-bold text-orange-300">
                  {formatNumber(expiringBatches.length)}
                </p>
                <p className="mt-1 text-xs text-orange-300/50">
                  Within {expiryDays} days
                </p>
              </div>

              <IconBox className="bg-orange-500/10 text-orange-400 ring-orange-500/20">
                <Clock3 size={21} />
              </IconBox>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <section className="min-w-0 rounded-3xl border border-white/[0.08] bg-[#101014] p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full min-w-0 xl:max-w-lg">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search medicine, brand, generic name or SKU..."
                aria-label="Search inventory"
                className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#08080a] py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 sm:pr-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {[
                { value: "all", label: "All" },
                { value: "healthy", label: "Healthy" },
                { value: "low_stock", label: "Low Stock" },
                {
                  value: "out_of_stock",
                  label: "Out of Stock",
                },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={stockFilter === filter.value}
                  onClick={() => setStockFilter(filter.value)}
                  className={`min-h-10 min-w-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm ${
                    stockFilter === filter.value
                      ? "bg-violet-600 text-white"
                      : "border border-white/[0.08] bg-[#18181d] text-zinc-400 hover:bg-[#22222a] hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Current Inventory */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014]">
          <div className="border-b border-white/[0.06] bg-[#121216] px-4 py-4 sm:px-5">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Current Inventory
                </h2>
                <p className="text-sm text-zinc-500">
                  {formatNumber(filteredInventory.length)} medicine
                  {filteredInventory.length === 1 ? "" : "s"} found
                </p>
              </div>

              <p className="text-xs text-zinc-600">
                Select a medicine to view its batches.
              </p>
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-6 sm:py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#151519]">
                <Package size={30} className="text-zinc-600" />
              </div>

              <p className="mt-4 font-medium text-zinc-300">
                No inventory found
              </p>

              <p className="mt-1 text-sm text-zinc-600">
                Try changing your search or stock filter.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Inventory Cards */}
              <div className="space-y-3 p-3 md:hidden">
                {filteredInventory.map((item) => {
                  const status = getStockStatus(item);
                  const StatusIcon = status.icon;

                  const isExpanded =
                    expandedMedicine === item.medicineId;

                  return (
                    <article
                      key={item.medicineId}
                      className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141418]"
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          toggleMedicine(item.medicineId)
                        }
                        className="block min-h-11 w-full min-w-0 p-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <IconBox
                            size="sm"
                            className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                          >
                            <Package size={17} />
                          </IconBox>

                          <div className="min-w-0 flex-1">
                            <p className="break-words font-semibold leading-5 text-white">
                              {item.medicineName ||
                                "Unnamed Medicine"}
                            </p>

                            <p className="mt-1 break-words text-xs text-zinc-500">
                              {item.genericName ||
                                item.brandName ||
                                "No generic name"}
                            </p>

                            <p className="mt-2 break-all text-xs text-zinc-600">
                              SKU: {item.sku || "—"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="min-w-0 rounded-xl bg-[#0c0c0f] p-3">
                            <p className="text-[11px] text-zinc-600">
                              Current Stock
                            </p>

                            <p className="mt-1 break-words text-lg font-bold text-white">
                              {formatNumber(item.currentStock)}
                            </p>

                            {Number(item.expiredQuantity) > 0 && (
                              <p className="mt-1 break-words text-[11px] text-red-400">
                                {formatNumber(item.expiredQuantity)} expired
                              </p>
                            )}
                          </div>

                          <div className="min-w-0 rounded-xl bg-[#0c0c0f] p-3">
                            <p className="text-[11px] text-zinc-600">
                              Reorder Level
                            </p>

                            <p className="mt-1 break-words text-lg font-bold text-white">
                              {formatNumber(item.reorderLevel)}
                            </p>
                          </div>

                          <div className="min-w-0 rounded-xl bg-[#0c0c0f] p-3">
                            <p className="text-[11px] text-zinc-600">
                              Inventory Value
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-zinc-200">
                              {formatCurrency(item.inventoryValue)}
                            </p>
                          </div>

                          <div className="min-w-0 rounded-xl bg-[#0c0c0f] p-3">
                            <p className="text-[11px] text-zinc-600">
                              Batches
                            </p>

                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-zinc-200">
                                {formatNumber(
                                  Array.isArray(item.batches)
                                    ? item.batches.length
                                    : 0
                                )}
                              </p>

                              {isExpanded ? (
                                <ChevronUp
                                  size={17}
                                  className="text-violet-400"
                                />
                              ) : (
                                <ChevronDown
                                  size={17}
                                  className="text-zinc-400"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="text-zinc-500">
                            {isExpanded
                              ? "Hide batch details"
                              : "View batch details"}
                          </span>

                          <span className="inline-flex items-center gap-1 text-violet-400">
                            {isExpanded ? "Collapse" : "Expand"}
                            {isExpanded ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </span>
                        </div>
                      </button>

                      {isExpanded && renderBatchDetails(item)}
                    </article>
                  );
                })}
              </div>

              {/* Desktop and Tablet Inventory Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-[#141418] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">
                        Medicine
                      </th>
                      <th className="px-5 py-4 font-medium">
                        SKU
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Stock
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Reorder
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Value
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Status
                      </th>
                      <th className="px-5 py-4 text-right font-medium">
                        Batches
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item);
                      const StatusIcon = status.icon;

                      const isExpanded =
                        expandedMedicine === item.medicineId;

                      return (
                        <tr key={item.medicineId}>
                          <td colSpan="7" className="p-0">
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                toggleMedicine(item.medicineId)
                              }
                              className="grid w-full cursor-pointer grid-cols-[minmax(260px,2fr)_minmax(120px,1fr)_minmax(90px,1fr)_minmax(100px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_80px] items-center text-left transition-colors hover:bg-[#18181d] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-violet-500"
                            >
                              <div className="min-w-0 px-5 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <IconBox
                                    size="sm"
                                    className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                                  >
                                    <Package size={17} />
                                  </IconBox>

                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-white">
                                      {item.medicineName ||
                                        "Unnamed Medicine"}
                                    </p>
                                    <p className="truncate text-xs text-zinc-600">
                                      {item.genericName ||
                                        item.brandName ||
                                        "No generic name"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="break-all px-5 py-4 text-sm text-zinc-400">
                                {item.sku || "—"}
                              </div>

                              <div className="px-5 py-4">
                                <span className="font-semibold text-white">
                                  {formatNumber(item.currentStock)}
                                </span>

                                {Number(item.expiredQuantity) > 0 && (
                                  <p className="mt-1 text-[11px] text-red-400">
                                    {formatNumber(item.expiredQuantity)} expired
                                  </p>
                                )}
                              </div>

                              <div className="px-5 py-4 text-sm text-zinc-400">
                                {formatNumber(item.reorderLevel)}
                              </div>

                              <div className="px-5 py-4 text-sm text-zinc-300">
                                {formatCurrency(item.inventoryValue)}
                              </div>

                              <div className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                                >
                                  <StatusIcon size={12} />
                                  {status.label}
                                </span>
                              </div>

                              <div className="flex justify-end px-5 py-4">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#202025] text-zinc-400">
                                  {isExpanded ? (
                                    <ChevronUp size={17} />
                                  ) : (
                                    <ChevronDown size={17} />
                                  )}
                                </span>
                              </div>
                            </button>

                            {isExpanded && renderBatchDetails(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Low Stock Medicines */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014]">
          <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <IconBox className="bg-amber-500/10 text-amber-400 ring-amber-500/20">
                <AlertTriangle size={17} />
              </IconBox>

              <div className="min-w-0">
                <h2 className="font-semibold text-white">
                  Low Stock Medicines
                </h2>
                <p className="text-xs text-zinc-600">
                  Medicines that have reached their reorder level.
                </p>
              </div>
            </div>
          </div>

          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <PackageCheck
                size={30}
                className="mx-auto text-emerald-500/50"
              />
              <p className="mt-3 text-sm text-zinc-500">
                No low-stock medicines.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {lowStock.map((item, index) => (
                <div
                  key={item.medicineId || item.id || index}
                  className="flex min-w-0 flex-col gap-3 px-4 py-4 transition-colors hover:bg-[#151519] sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-white">
                      {item.medicineName ||
                        item.name ||
                        "Unnamed Medicine"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Reorder level: {formatNumber(item.reorderLevel)}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-amber-300">
                      {formatNumber(
                        item.currentStock ?? item.stock
                      )}{" "}
                      units
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Current stock
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expiring Batches */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014]">
          <div className="flex min-w-0 flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <IconBox className="bg-orange-500/10 text-orange-400 ring-orange-500/20">
                <Clock3 size={17} />
              </IconBox>

              <div className="min-w-0">
                <h2 className="font-semibold text-white">
                  Expiring Batches
                </h2>
                <p className="text-xs text-zinc-600">
                  Batches approaching their expiry date.
                </p>
              </div>
            </div>

            <select
              value={expiryDays}
              onChange={(event) =>
                setExpiryDays(Number(event.target.value))
              }
              aria-label="Expiry date filter"
              className="min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-sm text-zinc-300 outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 sm:w-auto"
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
              <option value={180}>Next 180 days</option>
            </select>
          </div>

          {expiringBatches.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <PackageCheck
                size={30}
                className="mx-auto text-emerald-500/50"
              />
              <p className="mt-3 text-sm text-zinc-500">
                No batches are expiring within {expiryDays} days.
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:p-5 lg:grid-cols-2">
              {expiringBatches.map((batch, index) => (
                <div
                  key={batch.batchId || batch.id || index}
                  className="min-w-0 overflow-hidden rounded-2xl border border-orange-500/20 bg-[#17130e] p-4 transition-colors hover:border-orange-500/30"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-white">
                        {batch.medicine?.name ||
                          batch.medicineName ||
                          "Medicine"}
                      </p>
                      <p className="mt-1 break-words text-xs text-zinc-600">
                        Batch: {batch.batchNumber || "—"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[11px] font-medium text-orange-400">
                      {batch.daysUntilExpiry} days
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-zinc-600">Quantity</p>
                      <p className="mt-1 break-words font-semibold text-zinc-300">
                        {formatNumber(batch.quantity)}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-600">Expiry</p>
                      <p className="mt-1 break-words text-zinc-300">
                        {formatDate(batch.expiryDate)}
                      </p>
                    </div>

                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <p className="text-zinc-600">Supplier</p>
                      <p className="mt-1 break-words text-zinc-300">
                        {batch.supplier?.name || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expired Batches */}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-red-500/20 bg-[#101014]">
          <div className="border-b border-red-500/10 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <IconBox className="bg-red-500/10 text-red-400 ring-red-500/20">
                <ShieldAlert size={17} />
              </IconBox>

              <div className="min-w-0">
                <h2 className="font-semibold text-white">
                  Expired Batches
                </h2>
                <p className="text-xs text-zinc-600">
                  These batches should not be sold.
                </p>
              </div>
            </div>
          </div>

          {expiredBatches.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <PackageCheck
                size={30}
                className="mx-auto text-emerald-500/50"
              />
              <p className="mt-3 text-sm text-zinc-500">
                No expired batches found.
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:p-5 lg:grid-cols-2">
              {expiredBatches.map((batch, index) => (
                <div
                  key={batch.batchId || batch.id || index}
                  className="min-w-0 overflow-hidden rounded-2xl border border-red-500/15 bg-[#190f12] p-4 transition-colors hover:border-red-500/30"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-white">
                        {batch.medicine?.name ||
                          batch.medicineName ||
                          "Medicine"}
                      </p>
                      <p className="mt-1 break-words text-xs text-zinc-600">
                        Batch: {batch.batchNumber || "—"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400">
                      Expired
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-zinc-600">Quantity</p>
                      <p className="mt-1 break-words font-semibold text-red-300">
                        {formatNumber(batch.quantity)}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-600">Expired</p>
                      <p className="mt-1 break-words text-zinc-300">
                        {formatDate(batch.expiryDate)}
                      </p>
                    </div>

                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <p className="text-zinc-600">Supplier</p>
                      <p className="mt-1 break-words text-zinc-300">
                        {batch.supplier?.name || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustment && selectedBatch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/90 p-2 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !adjusting
            ) {
              closeAdjustment();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-stock-title"
            className="relative my-auto flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e11] shadow-2xl shadow-black/60 sm:max-h-[90dvh]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Pencil
                    size={17}
                    className="shrink-0 text-violet-400"
                  />
                  <h2
                    id="adjust-stock-title"
                    className="font-semibold text-white"
                  >
                    Adjust Stock
                  </h2>
                </div>

                <p className="mt-1 break-words text-xs text-zinc-600">
                  Batch: {selectedBatch.batchNumber || selectedBatch.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustment}
                disabled={adjusting}
                aria-label="Close stock adjustment"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-[#22222a] hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleAdjustment}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
                <div className="rounded-2xl border border-white/[0.08] bg-[#15121d] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-zinc-400">
                      Current Quantity
                    </span>

                    <span className="break-words text-lg font-bold text-white">
                      {formatNumber(selectedBatch.quantity)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="quantityChange"
                      className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                      Quantity Change
                    </label>

                    <input
                      id="quantityChange"
                      type="number"
                      step="1"
                      name="quantityChange"
                      value={adjustmentForm.quantityChange}
                      onChange={handleAdjustmentChange}
                      placeholder="Example: 10 or -5"
                      disabled={adjusting}
                      required
                      className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-4 py-3 text-base text-white outline-none placeholder:text-zinc-700 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 disabled:opacity-50 sm:text-sm"
                    />

                    <p className="mt-1.5 text-xs leading-5 text-zinc-600">
                      Positive numbers add stock. Negative numbers remove stock.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="adjustmentReason"
                      className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                      Reason
                    </label>

                    <textarea
                      id="adjustmentReason"
                      name="reason"
                      value={adjustmentForm.reason}
                      onChange={handleAdjustmentChange}
                      rows={3}
                      minLength={3}
                      placeholder="Why is this stock being adjusted?"
                      disabled={adjusting}
                      required
                      className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#08080a] px-4 py-3 text-base text-white outline-none placeholder:text-zinc-700 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 disabled:opacity-50 sm:text-sm"
                    />
                  </div>

                  {adjustmentError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-sm text-red-300"
                    >
                      <AlertTriangle
                        size={16}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="break-words">
                        {adjustmentError}
                      </span>
                    </div>
                  )}

                  {adjustmentForm.quantityChange.trim() !== "" &&
                    Number.isInteger(
                      Number(adjustmentForm.quantityChange)
                    ) && (
                      <div className="rounded-xl border border-white/[0.08] bg-[#121216] p-4">
                        <p className="text-xs text-zinc-600">
                          New quantity
                        </p>

                        <p
                          className={`mt-2 break-words text-xl font-bold ${
                            Number(selectedBatch.quantity ?? 0) +
                              Number(adjustmentForm.quantityChange) <
                            0
                              ? "text-red-400"
                              : "text-white"
                          }`}
                        >
                          {formatNumber(
                            Number(selectedBatch.quantity ?? 0) +
                              Number(adjustmentForm.quantityChange)
                          )}
                        </p>

                        {Number(selectedBatch.quantity ?? 0) +
                          Number(adjustmentForm.quantityChange) <
                          0 && (
                          <p className="mt-2 text-xs text-red-400">
                            The new quantity cannot be negative.
                          </p>
                        )}
                      </div>
                    )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.06] bg-[#0e0e11] px-4 py-4 sm:flex-row sm:px-5">
                <button
                  type="button"
                  onClick={closeAdjustment}
                  disabled={adjusting}
                  className="min-h-11 flex-1 rounded-xl border border-white/[0.08] bg-[#18181d] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-[#22222a] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adjusting && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {adjusting ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
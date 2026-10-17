
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Wallet,
  X
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// =====================================================
// Constants
// =====================================================

const SELLER_ROLES = ["admin", "pharmacist", "cashier"];
const MEDICINE_LIST_LIMIT = 40;
const EXCLUDED_STATUSES = [
  "failed",
  "refunded",
  "cancelled",
  "canceled",
  "voided"
];

const INPUT_CLASS =
  "w-full rounded-xl border border-white/[0.08] bg-[#08080a] px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10";

const LABEL_CLASS =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500";

const TH_CLASS =
  "px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500";

// =====================================================
// Helpers
// =====================================================

// Work in 2-decimal precision to avoid floating point drift.
const round2 = (value) =>
  Math.round((Number(value) || 0) * 100) / 100;

const humanize = (value) =>
  String(value || "").replace(/_/g, " ");

const plural = (count, singular, pluralForm = `${singular}s`) =>
  count === 1 ? singular : pluralForm;

const formatCurrency = (value) =>
  `GH₵${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDateTime = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return String(date);

  return parsedDate.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getStatusClasses = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "failed":
      return "border-rose-500/20 bg-rose-500/10 text-rose-400";
    case "pending":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";
    case "refunded":
      return "border-sky-500/20 bg-sky-500/10 text-sky-400";
    default:
      return "border-white/[0.08] bg-[#18181d] text-zinc-400";
  }
};

// Async because responseType "blob" delivers error bodies as Blobs.
const getErrorMessage = async (
  error,
  fallback = "Something went wrong."
) => {
  const data = error?.response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());

      if (parsed?.message) return parsed.message;
    } catch {
      // Body was not JSON; fall through to the fallback.
    }

    return fallback;
  }

  return data?.message || error?.message || fallback;
};

const getCustomerName = (customer) => {
  if (!customer) return "Walk-in Customer";

  return (
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    customer.name ||
    "Customer"
  );
};

const generateSaleNumber = () => {
  const now = new Date();
  const pad = (value, length = 2) =>
    String(value).padStart(length, "0");

  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}`;

  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `SALE-${date}-${time}-${random}`;
};

const getLocalDateKey = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${parsedDate.getFullYear()}-${month}-${day}`;
};

// Refunded / failed / cancelled sales should not count as revenue.
const isCountableSale = (sale) => {
  const saleStatus = String(sale?.status || "").toLowerCase();
  const paymentStatus = String(
    sale?.payments?.[0]?.status || ""
  ).toLowerCase();

  return (
    !EXCLUDED_STATUSES.includes(saleStatus) &&
    !EXCLUDED_STATUSES.includes(paymentStatus)
  );
};

const isBatchSellable = (batch, now) => {
  if (Number(batch.quantity || 0) <= 0) return false;
  if (batch.isExpired) return false;

  if (batch.expiryDate) {
    const expiry = new Date(batch.expiryDate);

    if (!Number.isNaN(expiry.getTime()) && expiry < now) {
      return false;
    }
  }

  return true;
};

const getExpiryTime = (batch) => {
  if (!batch.expiryDate) return Number.MAX_SAFE_INTEGER;

  const time = new Date(batch.expiryDate).getTime();

  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

// Allocates a quantity across batches in first-expiry-first-out
// order and prices each portion at its own batch's selling price.
const allocateFEFO = (batches, quantity) => {
  let remaining = Number(quantity) || 0;
  let total = 0;
  const allocations = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const take = Math.min(remaining, Number(batch.quantity || 0));
    const unitPrice = Number(batch.sellingPrice || 0);

    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: take,
      unitPrice
    });

    total += take * unitPrice;
    remaining -= take;
  }

  return {
    allocations,
    total: round2(total),
    shortfall: remaining
  };
};

// =====================================================
// Small shared components
// =====================================================

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

const Alert = ({ tone, title, message, onDismiss }) => {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        isError
          ? "border-rose-500/20 bg-[#1b1013] text-rose-300"
          : "border-emerald-500/20 bg-[#0e1b15] text-emerald-300"
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>

        <p
          className={`mt-1 break-words ${
            isError ? "text-rose-300/80" : "text-emerald-300/80"
          }`}
        >
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className={`rounded-lg p-1 transition-colors ${
          isError
            ? "text-rose-300/60 hover:bg-rose-500/10 hover:text-rose-200"
            : "text-emerald-300/60 hover:bg-emerald-500/10 hover:text-emerald-200"
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  description,
  icon: Icon,
  accent = "violet"
}) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.12]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },
    emerald: {
      gradient: "from-emerald-500/[0.12]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    },
    sky: {
      gradient: "from-sky-500/[0.12]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20"
    },
    amber: {
      gradient: "from-amber-500/[0.12]",
      icon: "bg-amber-500/10 text-amber-400 ring-amber-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101014] p-4 transition-colors duration-200 hover:border-white/[0.15]">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">{label}</p>

          <p className="mt-2 break-words text-xl font-bold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const PaymentMethodButton = ({ selected, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
      selected
        ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
        : "border-white/[0.08] bg-[#151519] text-zinc-500 hover:border-white/[0.15] hover:text-white"
    }`}
  >
    {icon}
    {label}
  </button>
);

const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-[#141418]">
      <Icon className="h-7 w-7 text-zinc-600" />
    </div>

    <p className="mt-4 text-sm font-semibold text-zinc-300">{title}</p>

    <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">
      {description}
    </p>
  </div>
);

const DetailValue = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-semibold text-zinc-200">
      {value ?? "—"}
    </p>
  </div>
);

const SectionHeader = ({ title, subtitle, children }) => (
  <div className="border-b border-white/[0.06] bg-[#121216] p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>

        <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
      </div>

      {children}
    </div>
  </div>
);

const SearchInput = ({ value, onChange, placeholder, className }) => (
  <div className={`relative w-full ${className}`}>
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${INPUT_CLASS} h-10 pl-10`}
    />
  </div>
);

const PaymentBadge = ({ payment, className = "" }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 font-semibold capitalize ${getStatusClasses(
      payment?.status || "completed"
    )} ${className}`}
  >
    {humanize(payment?.paymentMethod || "Payment")}
  </span>
);

// =====================================================
// Medicine card
// =====================================================

const MedicineCard = ({
  medicine,
  stock,
  price,
  batchNumber,
  inCart,
  disabled,
  onAdd
}) => {
  const outOfStock = stock <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(medicine)}
      disabled={disabled}
      className={`min-w-0 rounded-2xl border p-4 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-white/[0.04] bg-[#0c0c0f] opacity-60"
          : "border-white/[0.08] bg-[#141418] hover:border-violet-500/30 hover:bg-[#19161f]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">
              {medicine.name}
            </p>

            {medicine.isPrescriptionRequired && (
              <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                RX
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs text-zinc-500">
            {medicine.genericName || "No generic name"}
            {medicine.strength ? ` · ${medicine.strength}` : ""}
          </p>
        </div>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            outOfStock
              ? "border-white/[0.04] bg-[#0c0c0f] text-zinc-700"
              : "border-white/[0.08] bg-[#0b0b0e] text-zinc-500"
          }`}
        >
          {outOfStock ? (
            <X className="h-4 w-4" />
          ) : inCart ? (
            <Check className="h-4 w-4 text-violet-300" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block max-w-full truncate rounded-lg border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] font-semibold text-zinc-500">
            {medicine.sku || "No SKU"}
          </span>

          <p
            className={`mt-2 text-xs font-semibold ${
              outOfStock ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {outOfStock ? "Out of stock" : `${stock} available`}
          </p>
        </div>

        <div className="min-w-0 text-right">
          {outOfStock ? (
            <span className="text-xs font-semibold text-zinc-600">
              Unavailable
            </span>
          ) : (
            <>
              <p className="text-sm font-bold text-violet-300">
                {formatCurrency(price)}
              </p>

              {batchNumber && (
                <p className="mt-1 max-w-[120px] truncate text-[10px] text-zinc-600">
                  FEFO · {batchNumber}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
};

// =====================================================
// Cart line
// =====================================================

const CartLine = ({ line, onQuantityChange, onRemove }) => {
  const { item, stock, allocation, prescriptionRemaining, issues } = line;
  const { medicine, quantity } = item;

  const averagePrice = quantity > 0 ? allocation.total / quantity : 0;
  const multiBatch = allocation.allocations.length > 1;

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <IconBox
          size="sm"
          className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
        >
          <Package className="h-4 w-4" />
        </IconBox>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-white">
                {medicine.name}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {medicine.strength || ""}

                {medicine.isPrescriptionRequired && (
                  <span className="ml-2 text-amber-400">
                    Prescription
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemove(medicine.id)}
              aria-label={`Remove ${medicine.name}`}
              className="shrink-0 rounded-lg p-1 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#08080a]">
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(medicine.id, quantity - 1)
                }
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-[#1b1b20] hover:text-white disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <span className="w-8 text-center text-xs font-bold text-white">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  onQuantityChange(medicine.id, quantity + 1)
                }
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-[#1b1b20] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-w-0 text-right">
              <p className="text-sm font-bold text-white">
                {formatCurrency(allocation.total)}
              </p>

              <p className="text-[10px] text-zinc-600">
                {multiBatch ? "avg " : ""}
                {formatCurrency(averagePrice)} each
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {allocation.allocations.map((part) => (
              <span
                key={part.batchId ?? part.batchNumber}
                className="max-w-full truncate rounded-md border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] text-zinc-500"
              >
                {part.batchNumber || "Batch"}: {part.quantity} ×{" "}
                {formatCurrency(part.unitPrice)}
              </span>
            ))}

            <span className="rounded-md border border-white/[0.06] bg-[#0b0b0e] px-2 py-1 text-[10px] text-zinc-500">
              {stock} in stock
            </span>
          </div>

          {medicine.isPrescriptionRequired && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-[#1b160b] p-2">
              <p className="text-[11px] leading-4 text-amber-300">
                Prescription remaining:{" "}
                <span className="font-bold">
                  {prescriptionRemaining}
                </span>
              </p>
            </div>
          )}

          {issues.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg border border-rose-500/20 bg-[#1b1013] p-2">
              {issues.map((issue) => (
                <li
                  key={issue}
                  className="flex items-start gap-1.5 text-[11px] leading-4 text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Sale details modal
// =====================================================

const SaleDetailsModal = ({ sale, onClose }) => {
  const payment = sale.payments?.[0];

  const [downloading, setDownloading] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !downloading) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, downloading]);

  const handleDownloadReceipt = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      setReceiptError("");

      const response = await api.get(`/sales/${sale.id}/receipt`, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type: "application/pdf"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `receipt-${sale.saleNumber || sale.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Receipt download error:", downloadError);

      setReceiptError(
        await getErrorMessage(
          downloadError,
          "Unable to download receipt. Please try again."
        )
      );
    } finally {
      setDownloading(false);
    }
  };

  const summaryRows = [
    ["Subtotal", formatCurrency(sale.subtotal ?? sale.totalAmount)],
    ["Discount", `- ${formatCurrency(sale.discount)}`],
    ["Tax", `+ ${formatCurrency(sale.tax)}`]
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/85 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-details-title"
    >
      <button
        type="button"
        aria-label="Close sale details"
        onClick={onClose}
        disabled={downloading}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      <div className="relative flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-2xl shadow-black/60 sm:max-h-[92dvh]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] bg-[#121216] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              Sale Details
            </p>

            <h2
              id="sale-details-title"
              className="mt-1 break-words text-lg font-bold text-white"
            >
              {sale.saleNumber || `Sale #${sale.id}`}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {formatDateTime(sale.saleDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            aria-label="Close modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#19191e] text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                <DetailValue
                  label="Customer"
                  value={getCustomerName(sale.customer)}
                />
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-[#15111d] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Total
                </p>

                <p className="mt-1 break-words text-sm font-bold text-violet-300">
                  {formatCurrency(sale.totalAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Payment
                </p>

                <p className="mt-1 break-words text-sm font-semibold capitalize text-emerald-400">
                  {humanize(payment?.paymentMethod) || "—"}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0f]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#131317] p-4 sm:p-5">
                <Package className="h-4 w-4 text-violet-400" />

                <h3 className="text-sm font-semibold text-white">
                  Items Sold
                </h3>
              </div>

              {!sale.items?.length ? (
                <p className="p-5 text-sm text-zinc-500">
                  No item details are available for this sale.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {sale.items.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-white">
                            {item.medicine?.name || "Medicine"}
                          </p>

                          <p className="mt-1 break-words text-xs text-zinc-500">
                            {item.medicine?.strength || ""}
                            {item.batch?.batchNumber
                              ? ` · Batch ${item.batch.batchNumber}`
                              : ""}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 sm:gap-6">
                          <DetailValue
                            label="Quantity"
                            value={item.quantity}
                          />
                          <DetailValue
                            label="Unit Price"
                            value={formatCurrency(item.unitPrice)}
                          />
                          <DetailValue
                            label="Total"
                            value={formatCurrency(item.totalPrice)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0f] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-400" />

                <h3 className="text-sm font-semibold text-white">
                  Payment Information
                </h3>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailValue
                  label="Method"
                  value={humanize(payment?.paymentMethod) || "—"}
                />
                <DetailValue
                  label="Amount"
                  value={payment ? formatCurrency(payment.amount) : "—"}
                />
                <DetailValue label="Status" value={payment?.status} />
                <DetailValue
                  label="Reference"
                  value={payment?.transactionReference || "—"}
                />
              </div>

              {receiptError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-[#1b1013] p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />

                  <p className="break-words">{receiptError}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4 sm:p-5">
              <div className="space-y-3">
                {summaryRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="text-zinc-500">{label}</span>

                    <span className="text-zinc-300">{value}</span>
                  </div>
                ))}

                <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <span className="font-semibold text-white">Total</span>

                  <span className="text-xl font-bold text-violet-300">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-white/[0.06] bg-[#121216] px-4 py-4 sm:flex-row sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#19191e] px-5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-[#222228] hover:text-white disabled:opacity-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={downloading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white transition-colors hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Download Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Main Sales component
// =====================================================

const Sales = () => {
  const { user } = useAuth();

  const [sales, setSales] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [medicineSearch, setMedicineSearch] = useState("");

  const [selectedSale, setSelectedSale] = useState(null);

  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");

  // Synchronous double-submit guard (state updates are async).
  const submitLockRef = useRef(false);

  // One sale number per checkout attempt, reused on retry so a
  // timed-out request cannot create a duplicate sale.
  const saleNumberRef = useRef(null);

  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase();

  const canSell = SELLER_ROLES.includes(userRole);

  // ---------------------------------------------------
  // Data loading
  // ---------------------------------------------------

  const fetchData = useCallback(async (showFullLoader = true) => {
    try {
      if (showFullLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      const [
        salesResponse,
        medicinesResponse,
        customersResponse,
        prescriptionsResponse,
        inventoryResponse
      ] = await Promise.all([
        api.get("/sales"),
        api.get("/medicines"),
        api.get("/customers"),
        api.get("/prescriptions"),
        api.get("/inventory/summary")
      ]);

      if (salesResponse.data?.success) {
        setSales(salesResponse.data.sales || []);
      }

      if (medicinesResponse.data?.success) {
        setMedicines(medicinesResponse.data.medicines || []);
      }

      if (customersResponse.data?.success) {
        setCustomers(customersResponse.data.customers || []);
      }

      if (prescriptionsResponse.data?.success) {
        setPrescriptions(prescriptionsResponse.data.prescriptions || []);
      }

      if (inventoryResponse.data?.success) {
        setInventory(inventoryResponse.data.summary?.inventory || []);
      }
    } catch (fetchError) {
      console.error("Sales data loading error:", fetchError);

      setError(
        await getErrorMessage(
          fetchError,
          "Unable to load sales data. Please check your connection."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => setSuccessMessage(""), 4500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  // ---------------------------------------------------
  // Inventory: sellable (non-expired) batches only
  // ---------------------------------------------------

  const batchesByMedicine = useMemo(() => {
    const now = new Date();
    const map = new Map();

    inventory.forEach((item) => {
      const batches = (item.batches || [])
        .filter((batch) => isBatchSellable(batch, now))
        .sort((a, b) => getExpiryTime(a) - getExpiryTime(b));

      map.set(Number(item.medicineId), batches);
    });

    return map;
  }, [inventory]);

  const getBatches = useCallback(
    (medicineId) => batchesByMedicine.get(Number(medicineId)) || [],
    [batchesByMedicine]
  );

  // Stock is the sum of sellable batches, so expired stock never
  // passes the availability check.
  const getStock = useCallback(
    (medicineId) =>
      getBatches(medicineId).reduce(
        (sum, batch) => sum + Number(batch.quantity || 0),
        0
      ),
    [getBatches]
  );

  // ---------------------------------------------------
  // Prescriptions
  // ---------------------------------------------------

  const getPrescriptionItem = useCallback(
    (medicineId) => {
      if (!selectedCustomerId) return null;

      for (const prescription of prescriptions) {
        if (
          Number(prescription.customerId) !== Number(selectedCustomerId) ||
          String(prescription.status || "").toLowerCase() !== "active"
        ) {
          continue;
        }

        const item = prescription.items?.find(
          (prescriptionItem) =>
            Number(prescriptionItem.medicineId) === Number(medicineId) &&
            Number(prescriptionItem.quantity || 0) >
              Number(prescriptionItem.dispensedQuantity || 0)
        );

        if (item) return item;
      }

      return null;
    },
    [prescriptions, selectedCustomerId]
  );

  const getPrescriptionRemaining = useCallback(
    (medicineId) => {
      const item = getPrescriptionItem(medicineId);

      if (!item) return 0;

      return Math.max(
        0,
        Number(item.quantity || 0) - Number(item.dispensedQuantity || 0)
      );
    },
    [getPrescriptionItem]
  );

  // ---------------------------------------------------
  // Cart lines (derived, always in sync with inventory,
  // customer and prescriptions)
  // ---------------------------------------------------

  const cartLines = useMemo(
    () =>
      cart.map((item) => {
        const { medicine, quantity } = item;
        const stock = getStock(medicine.id);
        const allocation = allocateFEFO(getBatches(medicine.id), quantity);
        const prescriptionRemaining = medicine.isPrescriptionRequired
          ? getPrescriptionRemaining(medicine.id)
          : 0;

        const issues = [];

        if (quantity > stock) {
          issues.push(
            `Only ${stock} ${plural(stock, "unit")} available.`
          );
        } else if (allocation.allocations.some((part) => part.unitPrice <= 0)) {
          issues.push("A batch has no valid selling price.");
        }

        if (medicine.isPrescriptionRequired) {
          if (!selectedCustomerId) {
            issues.push("Select a customer to dispense this medicine.");
          } else if (prescriptionRemaining <= 0) {
            issues.push(
              "No active prescription with remaining quantity for this customer."
            );
          } else if (quantity > prescriptionRemaining) {
            issues.push(
              `Only ${prescriptionRemaining} ${plural(
                prescriptionRemaining,
                "unit"
              )} remain on the prescription.`
            );
          }
        }

        return {
          item,
          stock,
          allocation,
          prescriptionRemaining,
          issues
        };
      }),
    [
      cart,
      getStock,
      getBatches,
      getPrescriptionRemaining,
      selectedCustomerId
    ]
  );

  const hasCartIssues = cartLines.some((line) => line.issues.length > 0);

  // ---------------------------------------------------
  // Totals
  // ---------------------------------------------------

  const subtotal = round2(
    cartLines.reduce((sum, line) => sum + line.allocation.total, 0)
  );

  const discountAmount = round2(Number(discount) || 0);
  const taxAmount = round2(Number(tax) || 0);

  const totalAmount = round2(
    Math.max(0, subtotal - discountAmount + taxAmount)
  );

  const receivedAmount = round2(Number(paymentAmount) || 0);
  const changeAmount = round2(Math.max(0, receivedAmount - totalAmount));
  const paymentShortfall = round2(Math.max(0, totalAmount - receivedAmount));

  // ---------------------------------------------------
  // Statistics
  // ---------------------------------------------------

  const statistics = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const countable = sales.filter(isCountableSale);

    const todaySales = countable.filter(
      (sale) => sale.saleDate && getLocalDateKey(sale.saleDate) === todayKey
    );

    const sumRevenue = (list) =>
      round2(
        list.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)
      );

    return {
      totalSales: countable.length,
      todaySales: todaySales.length,
      todayRevenue: sumRevenue(todaySales),
      totalRevenue: sumRevenue(countable)
    };
  }, [sales]);

  // ---------------------------------------------------
  // Filtering
  // ---------------------------------------------------

  const filteredSales = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return sales;

    return sales.filter(
      (sale) =>
        String(sale.saleNumber || "").toLowerCase().includes(search) ||
        getCustomerName(sale.customer).toLowerCase().includes(search)
    );
  }, [sales, searchTerm]);

  // In-stock medicines first, so they are never hidden behind
  // out-of-stock ones by the list limit.
  const { visibleMedicines, totalMatches } = useMemo(() => {
    const search = medicineSearch.trim().toLowerCase();

    const matches = medicines
      .filter((medicine) => medicine.isActive !== false)
      .filter(
        (medicine) =>
          !search ||
          [
            medicine.name,
            medicine.genericName,
            medicine.brandName,
            medicine.sku,
            medicine.barcode
          ].some((field) => String(field || "").toLowerCase().includes(search))
      )
      .map((medicine) => ({ medicine, stock: getStock(medicine.id) }))
      .sort((a, b) => {
        const aIn = a.stock > 0 ? 0 : 1;
        const bIn = b.stock > 0 ? 0 : 1;

        if (aIn !== bIn) return aIn - bIn;

        return String(a.medicine.name || "").localeCompare(
          String(b.medicine.name || "")
        );
      });

    return {
      visibleMedicines: matches.slice(0, MEDICINE_LIST_LIMIT),
      totalMatches: matches.length
    };
  }, [medicines, medicineSearch, getStock]);

  const selectedCustomer = customers.find(
    (customer) => Number(customer.id) === Number(selectedCustomerId)
  );

  // ---------------------------------------------------
  // Cart actions
  // ---------------------------------------------------

  // Returns an error message, or "" if the quantity is allowed.
  const validateQuantity = (medicine, quantity) => {
    const stock = getStock(medicine.id);

    if (quantity > stock) {
      return `Only ${stock} ${plural(stock, "unit")} of ${
        medicine.name
      } ${stock === 1 ? "is" : "are"} currently available.`;
    }

    if (medicine.isPrescriptionRequired) {
      if (!selectedCustomerId) {
        return `${medicine.name} requires a prescription. Select a customer first.`;
      }

      const remaining = getPrescriptionRemaining(medicine.id);

      if (remaining <= 0) {
        return `No active prescription with remaining quantity was found for ${medicine.name} for this customer.`;
      }

      if (quantity > remaining) {
        return `Only ${remaining} ${plural(
          remaining,
          "unit"
        )} remain on the active prescription for ${medicine.name}.`;
      }
    }

    const { allocations } = allocateFEFO(getBatches(medicine.id), quantity);

    if (!allocations.length || allocations.some((part) => part.unitPrice <= 0)) {
      return `No valid selling price is available for ${medicine.name}.`;
    }

    return "";
  };

  const addMedicineToCart = (medicine) => {
    setError("");

    if (!canSell) {
      setError("Your account does not have permission to create sales.");
      return;
    }

    if (getStock(medicine.id) <= 0) {
      setError(`${medicine.name} is currently out of stock.`);
      return;
    }

    const existing = cart.find(
      (item) => Number(item.medicine.id) === Number(medicine.id)
    );

    const nextQuantity = existing ? existing.quantity + 1 : 1;
    const validationError = validateQuantity(medicine, nextQuantity);

    if (validationError) {
      setError(validationError);
      return;
    }

    setCart((current) =>
      existing
        ? current.map((item) =>
            Number(item.medicine.id) === Number(medicine.id)
              ? { ...item, quantity: nextQuantity }
              : item
          )
        : [...current, { medicine, quantity: 1 }]
    );
  };

  const updateCartQuantity = (medicineId, quantity) => {
    setError("");

    const cartItem = cart.find(
      (item) => Number(item.medicine.id) === Number(medicineId)
    );

    if (!cartItem) return;

    const nextQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

    // Reducing a quantity is always allowed so users can fix problems.
    if (nextQuantity > cartItem.quantity) {
      const validationError = validateQuantity(
        cartItem.medicine,
        nextQuantity
      );

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setCart((current) =>
      current.map((item) =>
        Number(item.medicine.id) === Number(medicineId)
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );
  };

  const removeCartItem = (medicineId) => {
    setCart((current) =>
      current.filter((item) => Number(item.medicine.id) !== Number(medicineId))
    );
  };

  const clearCart = () => {
    setCart([]);
    saleNumberRef.current = null;
  };

  const resetCheckout = () => {
    setCart([]);
    setSelectedCustomerId("");
    setPaymentAmount("");
    setPaymentMethod("cash");
    setTransactionReference("");
    setPaymentNotes("");
    setDiscount("");
    setTax("");
    setMedicineSearch("");
    saleNumberRef.current = null;
  };

  // ---------------------------------------------------
  // Complete sale
  // ---------------------------------------------------

  const handleCompleteSale = async () => {
    if (submitLockRef.current) return;

    if (!canSell) {
      setError("You do not have permission to create sales.");
      return;
    }

    if (!cart.length) {
      setError("Add at least one medicine to the cart.");
      return;
    }

    const firstIssue = cartLines.find((line) => line.issues.length > 0);

    if (firstIssue) {
      setError(
        `${firstIssue.item.medicine.name}: ${firstIssue.issues[0]}`
      );
      return;
    }

    if (Number(discount) < 0 || Number(tax) < 0) {
      setError("Discount and tax cannot be negative.");
      return;
    }

    if (discountAmount > subtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }

    if (paymentAmount === "" || receivedAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (receivedAmount < totalAmount) {
      setError(`Payment is short by ${formatCurrency(paymentShortfall)}.`);
      return;
    }

    submitLockRef.current = true;

    try {
      setSubmitting(true);
      setError("");

      if (!saleNumberRef.current) {
        saleNumberRef.current = generateSaleNumber();
      }

      const items = cartLines.map(({ item }) => {
        const prescriptionItem = item.medicine.isPrescriptionRequired
          ? getPrescriptionItem(item.medicine.id)
          : null;

        return {
          medicineId: Number(item.medicine.id),
          quantity: Number(item.quantity),
          ...(prescriptionItem
            ? { prescriptionItemId: Number(prescriptionItem.id) }
            : {})
        };
      });

      const payload = {
        saleNumber: saleNumberRef.current,
        discount: discountAmount,
        tax: taxAmount,
        customerId: selectedCustomerId
          ? Number(selectedCustomerId)
          : undefined,
        items,
        payment: {
          // Record the amount applied to the sale; change is not revenue.
          amount: totalAmount,
          paymentMethod,
          transactionReference: transactionReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined
        }
      };

      const response = await api.post("/sales", payload);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to complete sale."
        );
      }

      const createdSale = response.data.sale;

      // Use the server's total as the source of truth.
      setSuccessMessage(
        `Sale ${createdSale?.saleNumber || ""} completed for ${formatCurrency(
          createdSale?.totalAmount ?? totalAmount
        )}${
          changeAmount > 0
            ? `. Change due: ${formatCurrency(changeAmount)}`
            : ""
        }.`
      );

      resetCheckout();

      await fetchData(false);
    } catch (saleError) {
      console.error("Complete sale error:", saleError);

      setError(
        await getErrorMessage(saleError, "Unable to complete sale.")
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------
  // Sale details
  // ---------------------------------------------------

  const openSaleDetails = async (sale) => {
    try {
      setError("");

      const response = await api.get(`/sales/${sale.id}`);

      setSelectedSale(response.data?.success ? response.data.sale : sale);
    } catch (detailsError) {
      console.error("Sale details error:", detailsError);

      setSelectedSale(sale);
    }
  };

  const closeDetails = useCallback(() => setSelectedSale(null), []);

  // ---------------------------------------------------
  // Loading screen
  // ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] px-4 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-[#111014]">
            <Loader2 size={28} className="animate-spin text-violet-400" />

            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">Loading sales</p>

            <p className="mt-1 text-sm text-zinc-500">
              Connecting to the PharmaCore API...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const paymentCovered = receivedAmount >= totalAmount;
  const needsReference = paymentMethod !== "cash";

  // ---------------------------------------------------
  // Main UI
  // ---------------------------------------------------

  return (
    <div className="relative isolate min-h-full overflow-hidden bg-[#08080a] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#08080a]" />

      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
                <ShoppingCart className="h-3 w-3" />
              </span>
              Point of Sale
            </div>

            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sales
              <Sparkles size={20} className="text-violet-400/70" />
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Process pharmacy sales, handle payments, and automatically
              reduce inventory through FEFO batch selection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.08] bg-[#111114] px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/[0.15] hover:bg-[#19191e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <Alert
            tone="error"
            title="Something needs attention"
            message={error}
            onDismiss={() => setError("")}
          />
        )}

        {successMessage && (
          <Alert
            tone="success"
            title="Sale completed"
            message={successMessage}
            onDismiss={() => setSuccessMessage("")}
          />
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Sales"
            value={statistics.todaySales}
            description="Completed transactions today"
            icon={ShoppingCart}
            accent="violet"
          />
          <StatCard
            label="Today's Revenue"
            value={formatCurrency(statistics.todayRevenue)}
            description="Revenue recorded today"
            icon={Wallet}
            accent="emerald"
          />
          <StatCard
            label="Total Sales"
            value={statistics.totalSales}
            description="All completed sales"
            icon={FileText}
            accent="sky"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(statistics.totalRevenue)}
            description="Excludes refunded and failed sales"
            icon={CreditCard}
            accent="amber"
          />
        </div>

        {/* Point of Sale */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Medicine selection */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
            <SectionHeader
              title="Select Medicines"
              subtitle="Search and add medicines to the sale."
            >
              <SearchInput
                value={medicineSearch}
                onChange={setMedicineSearch}
                placeholder="Search medicines..."
                className="sm:w-72"
              />
            </SectionHeader>

            <div className="max-h-[620px] overflow-y-auto overscroll-contain p-4">
              {visibleMedicines.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No medicines found"
                  description="Try a different medicine name, barcode, or SKU."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {visibleMedicines.map(({ medicine, stock }) => {
                      const firstBatch = getBatches(medicine.id)[0];

                      return (
                        <MedicineCard
                          key={medicine.id}
                          medicine={medicine}
                          stock={stock}
                          price={Number(firstBatch?.sellingPrice || 0)}
                          batchNumber={firstBatch?.batchNumber}
                          inCart={cart.some(
                            (item) =>
                              Number(item.medicine.id) ===
                              Number(medicine.id)
                          )}
                          disabled={stock <= 0 || !canSell}
                          onAdd={addMedicineToCart}
                        />
                      );
                    })}
                  </div>

                  {totalMatches > MEDICINE_LIST_LIMIT && (
                    <p className="mt-4 text-center text-xs text-zinc-600">
                      Showing {MEDICINE_LIST_LIMIT} of {totalMatches}{" "}
                      medicines. Search to narrow the list.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Current sale */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
            <div className="border-b border-white/[0.06] bg-[#121216] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Current Sale
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {cart.length} {plural(cart.length, "medicine")} in cart
                  </p>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    Clear cart
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto overscroll-contain">
              {cart.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-[#141418]">
                    <ShoppingCart className="h-6 w-6 text-zinc-600" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-zinc-300">
                    Cart is empty
                  </p>

                  <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-600">
                    Select medicines from the list to start a sale.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {cartLines.map((line) => (
                    <CartLine
                      key={line.item.medicine.id}
                      line={line}
                      onQuantityChange={updateCartQuantity}
                      onRemove={removeCartItem}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Checkout form */}
            <div className="border-t border-white/[0.06] p-4 sm:p-5">
              <div className="space-y-4">
                <div>
                  <label htmlFor="sale-customer" className={LABEL_CLASS}>
                    Customer
                  </label>

                  <select
                    id="sale-customer"
                    value={selectedCustomerId}
                    onChange={(event) => {
                      setSelectedCustomerId(event.target.value);
                      setError("");
                    }}
                    className={`${INPUT_CLASS} h-11 cursor-pointer`}
                  >
                    <option value="" className="bg-[#111113]">
                      Walk-in Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                        className="bg-[#111113]"
                      >
                        {getCustomerName(customer)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="rounded-xl border border-violet-500/15 bg-[#15111d] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Selected Customer
                    </p>

                    <p className="mt-1 break-words text-xs font-semibold text-violet-300">
                      {getCustomerName(selectedCustomer)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sale-discount" className={LABEL_CLASS}>
                      Discount (GH₵)
                    </label>

                    <input
                      id="sale-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={discount}
                      onChange={(event) => setDiscount(event.target.value)}
                      placeholder="0.00"
                      className={`${INPUT_CLASS} h-10`}
                    />
                  </div>

                  <div>
                    <label htmlFor="sale-tax" className={LABEL_CLASS}>
                      Tax (GH₵)
                    </label>

                    <input
                      id="sale-tax"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={tax}
                      onChange={(event) => setTax(event.target.value)}
                      placeholder="0.00"
                      className={`${INPUT_CLASS} h-10`}
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Subtotal</span>
                      <span className="text-zinc-300">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Discount</span>
                      <span className="text-zinc-300">
                        - {formatCurrency(discountAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-zinc-500">
                      <span>Tax</span>
                      <span className="text-zinc-300">
                        + {formatCurrency(taxAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                      <span className="font-semibold text-white">Total</span>

                      <span className="text-xl font-bold text-violet-300">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <span className={LABEL_CLASS}>Payment Method</span>

                  <div className="grid grid-cols-2 gap-2">
                    <PaymentMethodButton
                      selected={paymentMethod === "cash"}
                      onClick={() => setPaymentMethod("cash")}
                      icon={<Wallet className="h-4 w-4" />}
                      label="Cash"
                    />
                    <PaymentMethodButton
                      selected={paymentMethod === "mobile_money"}
                      onClick={() => setPaymentMethod("mobile_money")}
                      icon={<Smartphone className="h-4 w-4" />}
                      label="Mobile Money"
                    />
                    <PaymentMethodButton
                      selected={paymentMethod === "card"}
                      onClick={() => setPaymentMethod("card")}
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Card"
                    />
                    <PaymentMethodButton
                      selected={paymentMethod === "bank_transfer"}
                      onClick={() => setPaymentMethod("bank_transfer")}
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Bank Transfer"
                    />
                  </div>
                </div>

                {/* Amount received */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="sale-payment-amount"
                      className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      Amount Received
                    </label>

                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(totalAmount))}
                      disabled={totalAmount <= 0}
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-violet-300 transition-colors hover:bg-violet-500/10 disabled:opacity-40"
                    >
                      Exact amount
                    </button>
                  </div>

                  <input
                    id="sale-payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                    className={`${INPUT_CLASS} h-12 text-base font-semibold`}
                  />
                </div>

                {paymentAmount !== "" && (
                  <div
                    className={`rounded-xl border p-3 ${
                      paymentCovered
                        ? "border-emerald-500/20 bg-[#0d1a13]"
                        : "border-rose-500/20 bg-[#1b1013]"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-3 font-semibold ${
                        paymentCovered
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      <span className="text-xs">
                        {paymentCovered ? "Change" : "Amount Short"}
                      </span>

                      <span className="text-sm font-bold">
                        {formatCurrency(
                          paymentCovered ? changeAmount : paymentShortfall
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {needsReference && (
                  <div>
                    <label
                      htmlFor="sale-transaction-reference"
                      className={LABEL_CLASS}
                    >
                      Transaction Reference
                    </label>

                    <input
                      id="sale-transaction-reference"
                      type="text"
                      value={transactionReference}
                      onChange={(event) =>
                        setTransactionReference(event.target.value)
                      }
                      placeholder="Optional transaction reference"
                      className={`${INPUT_CLASS} h-10`}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="sale-payment-notes" className={LABEL_CLASS}>
                    Payment Notes
                  </label>

                  <textarea
                    id="sale-payment-notes"
                    rows={2}
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    placeholder="Optional payment notes..."
                    className={`${INPUT_CLASS} resize-y py-3 text-xs`}
                  />
                </div>

                {hasCartIssues && (
                  <p className="flex items-start gap-2 text-xs text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Fix the highlighted cart items before completing the
                    sale.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={
                    submitting || !cart.length || !canSell || hasCartIssues
                  }
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-colors hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}

                  <span>
                    {submitting ? "Processing Sale..." : "Complete Sale"}
                  </span>
                </button>

                {!canSell && (
                  <p className="text-center text-xs text-rose-400">
                    Your account does not have permission to create sales.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sales history */}
        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101014] shadow-xl shadow-black/20">
          <SectionHeader
            title="Sales History"
            subtitle={`${filteredSales.length} ${plural(
              filteredSales.length,
              "sale"
            )} found`}
          >
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search sale or customer..."
              className="sm:w-80"
            />
          </SectionHeader>

          {filteredSales.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No sales found"
              description="Completed sales will appear here."
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-white/[0.05] md:hidden">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-white">
                          {sale.saleNumber || `Sale #${sale.id}`}
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          #{sale.id}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold text-white">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <IconBox
                        size="sm"
                        className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                      >
                        <User className="h-3.5 w-3.5" />
                      </IconBox>

                      <span className="min-w-0 break-words text-sm text-zinc-300">
                        {getCustomerName(sale.customer)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <CalendarDays className="h-4 w-4 text-zinc-600" />
                        {formatDateTime(sale.saleDate)}
                      </div>

                      <PaymentBadge
                        payment={sale.payments?.[0]}
                        className="text-[10px]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => openSaleDetails(sale)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#151519] px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-500/30 hover:text-violet-300"
                    >
                      <Eye className="h-4 w-4" />
                      View Sale Details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-[#131317] text-left">
                      <th className={TH_CLASS}>Sale</th>
                      <th className={TH_CLASS}>Customer</th>
                      <th className={TH_CLASS}>Date</th>
                      <th className={TH_CLASS}>Total</th>
                      <th className={TH_CLASS}>Payment</th>
                      <th className={`${TH_CLASS} text-right`}>Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="transition-colors hover:bg-[#151519]"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white">
                            {sale.saleNumber}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            #{sale.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <IconBox
                              size="sm"
                              className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                            >
                              <User className="h-3.5 w-3.5" />
                            </IconBox>

                            <span className="text-sm text-zinc-300">
                              {getCustomerName(sale.customer)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <CalendarDays className="h-4 w-4 text-zinc-600" />
                            {formatDateTime(sale.saleDate)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-white">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <PaymentBadge
                            payment={sale.payments?.[0]}
                            className="text-xs"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openSaleDetails(sale)}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#151519] px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-500/30 hover:bg-[#1b1625] hover:text-violet-300"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {selectedSale && (
          <SaleDetailsModal sale={selectedSale} onClose={closeDetails} />
        )}
      </div>
    </div>
  );
};

export default Sales;
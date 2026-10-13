
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Pill,
  Receipt,
  Truck,
  User,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";

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
// Purchase Details
// ======================================================

function PurchaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/purchases/${id}`);

      const data =
        response.data?.purchase ||
        response.data?.data ||
        response.data;

      setPurchase(data);
    } catch (err) {
      console.error("Failed to load purchase:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load purchase details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const formattedDate = useMemo(() => {
    if (!purchase?.purchaseDate) return "—";

    return new Date(purchase.purchaseDate).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, [purchase]);

  const formattedCreatedDate = useMemo(() => {
    if (!purchase?.createdAt) return "—";

    return new Date(purchase.createdAt).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, [purchase]);

  const items = purchase?.items || [];

  const calculatedTotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + Number(item.totalPrice || 0);
    }, 0);
  }, [items]);

  const displayTotal =
    purchase?.totalAmount !== undefined && purchase?.totalAmount !== null
      ? Number(purchase.totalAmount)
      : calculatedTotal;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "received":
        return {
          className:
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: CheckCircle2
        };

      case "pending":
        return {
          className:
            "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: Clock3
        };

      case "cancelled":
        return {
          className: "bg-red-500/10 text-red-400 border-red-500/20",
          icon: XCircle
        };

      default:
        return {
          className:
            "bg-white/[0.03] text-zinc-400 border-white/[0.08]",
          icon: AlertCircle
        };
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <Loader2 size={28} className="animate-spin text-violet-400" />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading purchase details
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Fetching transaction data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-[#0e0e11]/80 p-8 text-center backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
            <AlertCircle size={24} />
          </div>

          <h2 className="relative text-lg font-semibold text-white">
            Unable to load purchase
          </h2>

          <p className="relative mt-2 text-sm text-zinc-400">{error}</p>

          <button
            onClick={fetchPurchase}
            className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] to-transparent text-violet-400">
            <Package size={30} />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            Purchase not found
          </h2>

          <Link
            to="/purchases"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
          >
            <ArrowLeft size={16} />
            Back to Purchases
          </Link>
        </div>
      </div>
    );
  }

  const status = getStatusStyles(purchase.status);
  const StatusIcon = status.icon;
  const supplier = purchase.supplier || {};
  const creator = purchase.creator || {};

  return (
    <div className="relative min-h-full overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
      </div>

      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/purchases")}
              className="group mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 backdrop-blur-sm transition hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft
                size={19}
                className="transition-transform group-hover:-translate-x-0.5"
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
                  Purchase Details
                  <Sparkles
                    size={18}
                    className="text-violet-400/70"
                  />
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize backdrop-blur-sm ${status.className}`}
                >
                  <StatusIcon size={13} />
                  {purchase.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Review the complete purchase transaction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {purchase.status === "pending" && (
              <button
                onClick={() =>
                  navigate(`/purchases/${purchase.id}/receive`)
                }
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:shadow-xl hover:shadow-emerald-600/40 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <Truck size={17} className="relative" />
                <span className="relative">Receive Purchase</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Purchase Number"
            value={purchase.purchaseNumber}
            icon={Receipt}
            accent="violet"
          />

          <SummaryCard
            label="Purchase Date"
            value={formattedDate}
            icon={CalendarDays}
            accent="sky"
          />

          <SummaryCard
            label="Items"
            value={items.length}
            icon={Package}
            accent="emerald"
          />

          <SummaryCard
            label="Total Amount"
            value={formatCurrency(displayTotal)}
            icon={Receipt}
            accent="fuchsia"
          />
        </div>

        {/* Supplier + Creator */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <IconBox
                size="lg"
                className="bg-sky-500/10 text-sky-400 ring-sky-500/20"
              >
                <Truck size={19} />
              </IconBox>

              <div>
                <h2 className="font-semibold text-white">Supplier</h2>

                <p className="text-xs text-zinc-500">
                  Supplier information
                </p>
              </div>
            </div>

            <div className="relative mt-6 space-y-4">
              <DetailRow
                label="Supplier Name"
                value={supplier.name || "—"}
                emphasis
              />

              <DetailRow
                label="Contact Person"
                value={supplier.contactPerson || "—"}
              />

              <DetailRow label="Phone" value={supplier.phone || "—"} />

              <DetailRow label="Email" value={supplier.email || "—"} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex items-center gap-3">
              <IconBox
                size="lg"
                className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
              >
                <User size={19} />
              </IconBox>

              <div>
                <h2 className="font-semibold text-white">
                  Purchase Information
                </h2>

                <p className="text-xs text-zinc-500">
                  Transaction metadata
                </p>
              </div>
            </div>

            <div className="relative mt-6 space-y-4">
              <DetailRow
                label="Created By"
                value={
                  creator.firstName || creator.lastName
                    ? `${creator.firstName || ""} ${
                        creator.lastName || ""
                      }`.trim()
                    : creator.username || "—"
                }
                emphasis
              />

              <DetailRow
                label="Created Date"
                value={formattedCreatedDate}
              />

              <DetailRow
                label="Status"
                value={purchase.status}
                capitalize
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <IconBox
                size="lg"
                className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              >
                <Pill size={19} />
              </IconBox>

              <div>
                <h2 className="font-semibold text-white">
                  Purchased Medicines
                </h2>

                <p className="text-xs text-zinc-500">
                  Medicines included in this purchase
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.015] text-left">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Medicine
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Quantity
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Unit Price
                  </th>

                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.04]">
                {items.map((item) => {
                  const medicine = item.medicine || {};

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <IconBox
                            size="sm"
                            className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
                          >
                            <Pill size={17} />
                          </IconBox>

                          <div>
                            <p className="font-medium text-white">
                              {medicine.name ||
                                `Medicine #${item.medicineId}`}
                            </p>

                            {medicine.genericName && (
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {medicine.genericName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-zinc-300">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-5 text-sm text-zinc-300">
                        {formatCurrency(item.unitPrice)}
                      </td>

                      <td className="px-6 py-5 text-sm font-semibold text-white">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-sm text-zinc-500"
                    >
                      No purchase items found.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr className="border-t border-white/[0.08] bg-gradient-to-r from-white/[0.02] to-transparent">
                  <td
                    colSpan="3"
                    className="px-6 py-5 text-right text-sm font-medium text-zinc-400"
                  >
                    Purchase Total
                  </td>

                  <td className="px-6 py-5 text-lg font-bold text-white">
                    {formatCurrency(displayTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {purchase.notes && (
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-fuchsia-400" />
              <h2 className="font-semibold text-white">Notes</h2>
            </div>

            <p className="relative mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {purchase.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================
// Summary Card
// ======================================================

const SummaryCard = ({ label, value, icon: Icon, accent = "violet" }) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.14]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },
    sky: {
      gradient: "from-sky-500/[0.14]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20"
    },
    emerald: {
      gradient: "from-emerald-500/[0.14]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    },
    fuchsia: {
      gradient: "from-fuchsia-500/[0.14]",
      icon: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:shadow-black/60">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </p>

          <p className="mt-2 break-words text-lg font-bold leading-tight text-white">
            {value}
          </p>
        </div>

        <IconBox size="lg" className={style.icon}>
          <Icon size={19} />
        </IconBox>
      </div>
    </div>
  );
};

// ======================================================
// Detail Row
// ======================================================

const DetailRow = ({ label, value, emphasis = false, capitalize = false }) => (
  <div>
    <p className="text-xs text-zinc-500">{label}</p>

    <p
      className={`mt-1 break-words ${
        emphasis ? "font-medium text-white" : "text-sm text-zinc-300"
      } ${capitalize ? "capitalize" : ""}`}
    >
      {value}
    </p>
  </div>
);

export default PurchaseDetails;
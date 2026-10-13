
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CalendarDays,
  Edit3,
  Loader2,
  Package,
  Pill,
  Shield,
  TrendingUp,
  Warehouse
} from "lucide-react";

import api from "../services/api";

// ======================================================
// Helpers
// ======================================================

const formatCurrency = (value) =>
  `GH₵ ${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getStatusClasses = (status) => {
  switch (status) {
    case "in_stock":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "low_stock":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";
    case "out_of_stock":
      return "border-rose-500/20 bg-rose-500/10 text-rose-400";
    default:
      return "border-white/[0.08] bg-white/[0.03] text-zinc-400";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return status || "Unknown";
  }
};

// ======================================================
// Tabs
// ======================================================

const TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "batches", label: "Batches", icon: Boxes },
  { id: "pricing", label: "Pricing", icon: TrendingUp }
];

// ======================================================
// Medicine Details Page
// ======================================================

const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [stock, setStock] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [imageFailed, setImageFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [medicineResponse, stockResponse] = await Promise.all([
          api.get(`/medicines/${id}`),
          api.get(`/inventory/medicine/${id}`)
        ]);

        setMedicine(medicineResponse.data?.medicine || null);
        setStock(stockResponse.data || null);
      } catch (err) {
        console.error("Medicine details error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load medicine details."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const batches = useMemo(
    () => stock?.batches || [],
    [stock]
  );

  const status = stock?.stockStatus || "out_of_stock";

  const totalStock = stock?.currentStock || 0;

  const retailValue = stock?.retailValue || 0;
  const inventoryValue = stock?.inventoryValue || 0;
  const potentialProfit = stock?.potentialProfit || 0;

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
              Loading medicine details
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Fetching catalogue and inventory data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/20 bg-[#0e0e11]/80 p-8 text-center backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20">
            <AlertTriangle size={24} />
          </div>

          <h2 className="relative text-lg font-semibold text-white">
            Unable to load medicine
          </h2>

          <p className="relative mt-2 text-sm text-zinc-500">
            {error || "Medicine not found."}
          </p>

          <Link
            to="/medicines"
            className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-xl hover:shadow-violet-600/40"
          >
            <ArrowLeft size={16} />
            Back to Medicines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
      </div>

      <div className="space-y-6 pb-10">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/medicines")}
            className="group mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 backdrop-blur-sm transition hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft
              size={19}
              className="transition-transform group-hover:-translate-x-0.5"
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {medicine.name}
              </h1>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                  status
                )}`}
              >
                {getStatusLabel(status)}
              </span>

              {medicine.isPrescriptionRequired && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                  <Shield size={12} />
                  Prescription Only
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              {medicine.genericName || "Generic formulation"}
              {medicine.strength ? ` · ${medicine.strength}` : ""}
              {medicine.dosageForm ? ` · ${medicine.dosageForm}` : ""}
            </p>
          </div>

          <Link
            to="/medicines"
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white sm:flex"
          >
            <Edit3 size={16} />
            Edit in catalogue
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

            {medicine.imageUrl && !imageFailed ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="relative block w-full"
              >
                <img
                  src={medicine.imageUrl}
                  alt={medicine.name}
                  onError={() => setImageFailed(true)}
                  className="mx-auto h-64 w-full cursor-zoom-in rounded-2xl object-contain transition-transform hover:scale-105"
                />
              </button>
            ) : (
              <div className="relative flex h-64 items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.08] to-transparent">
                <Pill size={64} className="text-violet-400/60" />
              </div>
            )}

            <div className="relative mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  SKU
                </p>
                <p className="mt-1 truncate font-mono text-xs font-semibold text-white">
                  {medicine.sku || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Barcode
                </p>
                <p className="mt-1 truncate font-mono text-xs font-semibold text-white">
                  {medicine.barcode || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Available Stock"
                value={totalStock.toLocaleString()}
                suffix="units"
                icon={Warehouse}
                accent="violet"
              />
              <MetricCard
                label="Retail Value"
                value={formatCurrency(retailValue)}
                suffix="at selling price"
                icon={TrendingUp}
                accent="emerald"
              />
              <MetricCard
                label="Potential Profit"
                value={formatCurrency(potentialProfit)}
                suffix="if all sold"
                icon={Package}
                accent="amber"
              />
            </div>

            {medicine.description && (
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-violet-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Clinical Description
                  </h2>
                </div>

                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  {medicine.description}
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Reorder Level
                  </p>

                  <p className="mt-1 text-sm text-zinc-300">
                    Alert triggers below{" "}
                    <span className="font-semibold text-white">
                      {medicine.reorderLevel}
                    </span>{" "}
                    units
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2">
                  <p className="font-mono text-sm font-semibold text-white">
                    {medicine.reorderLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] pb-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-violet-500/[0.15] to-fuchsia-500/[0.08] text-violet-300 ring-1 ring-inset ring-violet-500/30 shadow-lg shadow-violet-600/10"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-2xl">
          {activeTab === "overview" && (
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <InfoRow label="Medicine Name" value={medicine.name} />
              <InfoRow label="Generic Name" value={medicine.genericName} />
              <InfoRow label="Brand Name" value={medicine.brandName} />
              <InfoRow label="Dosage Form" value={medicine.dosageForm} />
              <InfoRow label="Strength" value={medicine.strength} />
              <InfoRow
                label="Category"
                value={medicine.category?.name || "Uncategorized"}
              />
              <InfoRow
                label="Prescription Required"
                value={
                  medicine.isPrescriptionRequired ? "Yes" : "No"
                }
              />
              <InfoRow
                label="Active"
                value={medicine.isActive ? "Yes" : "No"}
              />
            </div>
          )}

          {activeTab === "batches" && (
            <div>
              {batches.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center p-6">
                  <div className="text-center">
                    <Package size={36} className="mx-auto text-zinc-600" />

                    <p className="mt-3 text-sm font-medium text-zinc-400">
                      No batches recorded
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Batches appear here after purchases are received.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Batch
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Purchase Price
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Selling Price
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Expiry
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {batches.map((batch) => {
                      const expired = batch.isExpired;

                      return (
                        <tr
                          key={batch.id}
                          className={`transition ${
                            expired
                              ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]"
                              : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <p className="font-mono text-sm font-medium text-white">
                              {batch.batchNumber}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-zinc-300">
                            {batch.quantity.toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-sm text-zinc-400">
                            {formatCurrency(batch.purchasePrice)}
                          </td>

                          <td className="px-6 py-4 text-sm text-zinc-300">
                            {formatCurrency(batch.sellingPrice)}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                size={14}
                                className={
                                  expired
                                    ? "text-rose-400"
                                    : "text-zinc-500"
                                }
                              />

                              <span
                                className={`text-sm ${
                                  expired
                                    ? "text-rose-400"
                                    : "text-zinc-300"
                                }`}
                              >
                                {formatDate(batch.expiryDate)}
                              </span>

                              {!expired &&
                                batch.daysUntilExpiry != null &&
                                batch.daysUntilExpiry <= 90 && (
                                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                    {batch.daysUntilExpiry}d
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Total Inventory Cost
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatCurrency(inventoryValue)}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    What you paid for the current stock
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Total Retail Value
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-400">
                    {formatCurrency(retailValue)}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    What you'll earn if all is sold
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-500/10 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-5 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Potential Profit
                  </p>

                  <p className="mt-2 text-3xl font-bold text-violet-300">
                    {formatCurrency(potentialProfit)}
                  </p>

                  {retailValue > 0 && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Margin:{" "}
                      {(
                        (potentialProfit / retailValue) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && medicine.imageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={medicine.imageUrl}
            alt={medicine.name}
            className="max-h-[85vh] max-w-[85vw] cursor-zoom-out rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  suffix,
  icon: Icon,
  accent = "violet"
}) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.14]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },
    emerald: {
      gradient: "from-emerald-500/[0.14]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    },
    amber: {
      gradient: "from-amber-500/[0.14]",
      icon: "bg-amber-500/10 text-amber-400 ring-amber-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
            {label}
          </p>

          <p className="mt-2 break-words text-xl font-bold text-white">
            {value}
          </p>

          {suffix && (
            <p className="mt-1 text-xs text-zinc-600">{suffix}</p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.icon}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
      {label}
    </p>

    <p className="mt-1 break-words text-sm text-zinc-200">
      {value || "—"}
    </p>
  </div>
);

export default MedicineDetails;
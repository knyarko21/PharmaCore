
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Package,
  Pill,
  Save,
  Truck,
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
// Receive Purchase
// ======================================================

function ReceivePurchase() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [items, setItems] = useState([]);

  // ======================================================
  // Fetch Purchase
  // ======================================================

  const fetchPurchase = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/purchases/${id}`);

      const data =
        response.data?.purchase ||
        response.data?.data?.purchase ||
        response.data?.data ||
        response.data;

      if (!data || !data.id) {
        throw new Error(
          "The purchase could not be found in the API response."
        );
      }

      setPurchase(data);

      const purchaseItems = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.purchaseItems)
          ? data.purchaseItems
          : [];

      const preparedItems = purchaseItems.map((item) => ({
        purchaseItemId: item.id,
        medicineId: item.medicineId,
        medicineName:
          item.medicine?.name ||
          item.Medicine?.name ||
          `Medicine #${item.medicineId}`,

        orderedQuantity: Number(item.quantity || 0),
        quantity: Number(item.quantity || 0),

        batchNumber: "",
        sellingPrice: "",
        expiryDate: "",
        manufactureDate: ""
      }));

      setItems(preparedItems);

      if (preparedItems.length === 0) {
        setError(
          "No items were found for this purchase. Check the purchase details before receiving it."
        );
      }
    } catch (err) {
      console.error("Failed to load purchase:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load purchase."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  // ======================================================
  // Update Item
  // ======================================================

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );

    setError("");
    setSuccess("");
  };

  // ======================================================
  // Format Currency
  // ======================================================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  // ======================================================
  // Validate Form
  // ======================================================

  const validateForm = () => {
    if (!purchase) {
      return "Purchase information is not available.";
    }

    if (purchase.status !== "pending") {
      return "This purchase has already been processed and cannot be received again.";
    }

    if (items.length === 0) {
      return "There are no purchase items to receive.";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of items) {
      if (!item.purchaseItemId) {
        return `Purchase item ID is missing for ${item.medicineName}.`;
      }

      if (
        item.quantity === "" ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
      ) {
        return `Received quantity for ${item.medicineName} must be a whole number greater than zero.`;
      }

      if (
        Number(item.quantity) >
        Number(item.orderedQuantity)
      ) {
        return `Received quantity for ${item.medicineName} cannot exceed the ordered quantity of ${item.orderedQuantity}.`;
      }

      if (!item.batchNumber.trim()) {
        return `Enter a batch number for ${item.medicineName}.`;
      }

      if (item.batchNumber.trim().length < 2) {
        return `The batch number for ${item.medicineName} must contain at least 2 characters.`;
      }

      if (item.batchNumber.trim().length > 100) {
        return `The batch number for ${item.medicineName} cannot exceed 100 characters.`;
      }

      if (
        item.sellingPrice === "" ||
        !Number.isFinite(Number(item.sellingPrice)) ||
        Number(item.sellingPrice) < 0
      ) {
        return `Enter a valid selling price of zero or more for ${item.medicineName}.`;
      }

      if (!item.expiryDate) {
        return `Enter an expiry date for ${item.medicineName}.`;
      }

      // Check that expiry date is a real calendar date.
      const expiryDate = new Date(
        `${item.expiryDate}T00:00:00`
      );

      if (
        Number.isNaN(expiryDate.getTime()) ||
        expiryDate.toISOString().slice(0, 10) !== item.expiryDate
      ) {
        return `Enter a valid expiry date for ${item.medicineName}.`;
      }

      if (expiryDate <= today) {
        return `The expiry date for ${item.medicineName} must be in the future.`;
      }

      if (item.manufactureDate) {
        const manufactureDate = new Date(
          `${item.manufactureDate}T00:00:00`
        );

        if (
          Number.isNaN(manufactureDate.getTime()) ||
          manufactureDate.toISOString().slice(0, 10) !==
            item.manufactureDate
        ) {
          return `Enter a valid manufacture date for ${item.medicineName}.`;
        }

        if (manufactureDate > expiryDate) {
          return `Manufacture date cannot be after expiry date for ${item.medicineName}.`;
        }

        if (manufactureDate > today) {
          return `Manufacture date cannot be in the future for ${item.medicineName}.`;
        }
      }
    }

    return "";
  };

  // ======================================================
  // Receive Purchase
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    // IMPORTANT:
    // The backend validator accepts an empty string for an
    // optional manufacture date, but it does not accept null.
    const payload = {
      items: items.map((item) => ({
        purchaseItemId: Number(item.purchaseItemId),
        quantity: Number(item.quantity),
        batchNumber: item.batchNumber.trim(),
        sellingPrice: Number(item.sellingPrice),
        expiryDate: item.expiryDate,
        manufactureDate: item.manufactureDate || ""
      }))
    };

    try {
      setSubmitting(true);

      console.log("Receiving purchase:", id);
      console.log("Receive purchase payload:", payload);

      const response = await api.post(
        `/purchases/${id}/receive`,
        payload
      );

      console.log(
        "Receive purchase response:",
        response.data
      );

      setSuccess(
        response.data?.message ||
        "Purchase received successfully. Stock has been added to inventory."
      );

      // Refresh purchase information after receiving.
      // The status guard below will then show the processed screen.
      await fetchPurchase();

      // Navigate to the purchase details page after a short delay.
      setTimeout(() => {
        navigate(`/purchases/${id}`);
      }, 1200);
    } catch (err) {
      console.error("Receive purchase error:", err);

      const responseData = err.response?.data;
      const validationErrors = responseData?.errors;

      console.error(
        "Backend response:",
        responseData
      );

      if (
        Array.isArray(validationErrors) &&
        validationErrors.length > 0
      ) {
        setError(
          validationErrors
            .map((validationError) => {
              const field = validationError.field;
              const message =
                validationError.message || "Invalid input";

              return field
                ? `${field}: ${message}`
                : message;
            })
            .join(" · ")
        );
      } else {
        setError(
          responseData?.message ||
          err.message ||
          "Failed to receive purchase."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ======================================================
  // Loading Screen
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <Truck
              size={28}
              className="text-violet-400"
            />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />

            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading purchase
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Preparing receiving form...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // Purchase Not Found
  // ======================================================

  if (!purchase) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-500/20 bg-[#0e0e11]/80 p-8 text-center backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
            <AlertCircle size={26} />
          </div>

          <h2 className="relative text-lg font-semibold text-white">
            Unable to load purchase
          </h2>

          <p className="relative mt-2 text-sm text-zinc-400">
            {error || "The purchase could not be found."}
          </p>

          <button
            type="button"
            onClick={fetchPurchase}
            className="relative mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            <Loader2 size={16} />
            Try Again
          </button>

          <Link
            to="/purchases"
            className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-xl hover:shadow-violet-600/40"
          >
            <ArrowLeft size={16} />
            Back to Purchases
          </Link>
        </div>
      </div>
    );
  }

  // ======================================================
  // Purchase Already Processed
  // ======================================================

  if (purchase.status !== "pending") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            <CheckCircle2 size={26} />
          </div>

          <h2 className="relative text-xl font-semibold text-white">
            Purchase Already Processed
          </h2>

          <p className="relative mt-2 text-sm leading-6 text-zinc-400">
            This purchase has already been processed and cannot be
            received again.
          </p>

          <button
            type="button"
            onClick={() => navigate(`/purchases/${id}`)}
            className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:shadow-xl hover:shadow-violet-600/40"
          >
            <ArrowLeft size={16} />
            Back to Purchase
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // Main Receive Purchase Page
  // ======================================================

  return (
    <div className="relative min-h-full overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-600/[0.08] blur-[120px]" />

        <div className="absolute -left-40 top-1/3 h-[450px] w-[450px] rounded-full bg-violet-600/[0.07] blur-[120px]" />

        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-fuchsia-600/[0.05] blur-[120px]" />
      </div>

      <div className="space-y-6 pb-10">
        {/* Page Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate(`/purchases/${id}`)}
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
                  Receive Purchase

                  <Sparkles
                    size={18}
                    className="text-emerald-400/70"
                  />
                </h1>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 backdrop-blur-sm">
                  <Truck size={13} />
                  Pending
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Receive stock and record batch information.
              </p>
            </div>
          </div>
        </div>

        {/* Purchase Summary Cards */}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/[0.14] to-transparent" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Purchase Number
                </p>

                <p className="mt-2 break-words text-lg font-semibold text-white">
                  {purchase.purchaseNumber || `PUR-${purchase.id}`}
                </p>
              </div>

              <IconBox
                size="lg"
                className="bg-violet-500/10 text-violet-400 ring-violet-500/20"
              >
                <Package size={19} />
              </IconBox>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/[0.14] to-transparent" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Purchase Date
                </p>

                <p className="mt-2 break-words text-sm font-medium text-white">
                  {purchase.purchaseDate
                    ? new Date(
                        purchase.purchaseDate
                      ).toLocaleDateString("en-GH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })
                    : "—"}
                </p>
              </div>

              <IconBox
                size="lg"
                className="bg-sky-500/10 text-sky-400 ring-sky-500/20"
              >
                <CalendarDays size={19} />
              </IconBox>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/[0.14] to-transparent" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Medicines
                </p>

                <p className="mt-2 text-lg font-semibold text-white">
                  {items.length}
                </p>
              </div>

              <IconBox
                size="lg"
                className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              >
                <Package size={19} />
              </IconBox>
            </div>
          </div>
        </div>

        {/* Error Message */}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent px-5 py-4 backdrop-blur-sm"
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div>
              <p className="text-sm font-medium text-red-300">
                Unable to receive purchase
              </p>

              <p className="mt-1 break-words text-sm text-red-400/80">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-5 py-4 backdrop-blur-sm"
          >
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-400"
            />

            <div>
              <p className="text-sm font-medium text-emerald-300">
                Purchase received
              </p>

              <p className="mt-1 text-sm text-emerald-400/80">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Receiving Form */}

        <form onSubmit={handleSubmit} className="space-y-6">
          {items.map((item, index) => (
            <div
              key={item.purchaseItemId}
              className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-2xl"
            >
              {/* Medicine Header */}

              <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <IconBox
                      size="lg"
                      className="bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] text-violet-400 ring-violet-500/20"
                    >
                      <Pill size={20} />
                    </IconBox>

                    <div>
                      <h2 className="font-semibold text-white">
                        {item.medicineName}
                      </h2>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        Purchase item #{item.purchaseItemId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-black/30 px-4 py-2 backdrop-blur-sm">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Ordered
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {item.orderedQuantity}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-2 backdrop-blur-sm">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-500/70">
                        Receiving
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                        {item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medicine Fields */}

              <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
                {/* Received Quantity */}

                <div>
                  <label
                    htmlFor={`quantity-${index}`}
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Received Quantity
                  </label>

                  <input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    max={item.orderedQuantity}
                    step="1"
                    required
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "quantity",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />

                  <p className="mt-1.5 text-xs text-zinc-600">
                    Maximum: {item.orderedQuantity}
                  </p>
                </div>

                {/* Batch Number */}

                <div>
                  <label
                    htmlFor={`batch-number-${index}`}
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Batch Number
                  </label>

                  <input
                    id={`batch-number-${index}`}
                    type="text"
                    minLength="2"
                    maxLength="100"
                    required
                    value={item.batchNumber}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "batchNumber",
                        event.target.value
                      )
                    }
                    placeholder="e.g. BATCH-PARA-001"
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />
                </div>

                {/* Selling Price */}

                <div>
                  <label
                    htmlFor={`selling-price-${index}`}
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Selling Price
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      GH₵
                    </span>

                    <input
                      id={`selling-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.sellingPrice}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "sellingPrice",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3 pl-14 pr-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                    />
                  </div>
                </div>

                {/* Expiry Date */}

                <div>
                  <label
                    htmlFor={`expiry-date-${index}`}
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Expiry Date
                  </label>

                  <input
                    id={`expiry-date-${index}`}
                    type="date"
                    required
                    value={item.expiryDate}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "expiryDate",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />
                </div>

                {/* Manufacture Date */}

                <div>
                  <label
                    htmlFor={`manufacture-date-${index}`}
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Manufacture Date
                    <span className="ml-1 text-xs text-zinc-600">
                      (optional)
                    </span>
                  </label>

                  <input
                    id={`manufacture-date-${index}`}
                    type="date"
                    value={item.manufactureDate}
                    onChange={(event) =>
                      updateItem(
                        index,
                        "manufactureDate",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />

                  <p className="mt-1.5 text-xs text-zinc-600">
                    Optional
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Form Actions */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/purchases/${id}`)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={17} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:shadow-xl hover:shadow-emerald-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {submitting ? (
                <>
                  <Loader2
                    size={17}
                    className="relative animate-spin"
                  />

                  <span className="relative">
                    Receiving...
                  </span>
                </>
              ) : (
                <>
                  <Save size={17} className="relative" />

                  <span className="relative">
                    Receive Stock
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReceivePurchase;
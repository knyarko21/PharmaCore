
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Hash,
  Loader2,
  Package,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Truck,
  Wallet
} from "lucide-react";

import api from "../services/api";

// ======================================================
// Helpers
// ======================================================

const getToday = () => {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().split("T")[0];
};

const formatCurrency = (amount) =>
  `GH₵ ${Number(amount || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const extractArray = (response, keys) => {
  let data = response?.data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return Array.isArray(data) ? data : [];
};

// ======================================================
// Icon Box
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
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
};

// ======================================================
// Create Purchase
// ======================================================

const CreatePurchase = () => {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdPurchase, setCreatedPurchase] = useState(null);

  const [formData, setFormData] = useState({
    purchaseDate: getToday(),
    supplierId: "",
    notes: ""
  });

  const [items, setItems] = useState([
    {
      medicineId: "",
      quantity: "1",
      unitPrice: ""
    }
  ]);

  // --------------------------------------------------
  // Load suppliers and medicines
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    const fetchFormData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          suppliersResponse,
          medicinesResponse
        ] = await Promise.all([
          api.get("/suppliers"),
          api.get("/medicines")
        ]);

        if (!active) return;

        const supplierData = extractArray(
          suppliersResponse,
          ["suppliers"]
        );

        const medicineData = extractArray(
          medicinesResponse,
          ["medicines"]
        );

        setSuppliers(supplierData);
        setMedicines(medicineData);
      } catch (err) {
        if (!active) return;

        console.error(
          "Failed to load purchase form data:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load suppliers and medicines. Please refresh the page."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFormData();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Handle general form changes
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setError("");
  };

  // --------------------------------------------------
  // Handle purchase item changes
  // --------------------------------------------------

  const handleItemChange = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [field]: value
        };
      })
    );

    setError("");
  };

  // --------------------------------------------------
  // Add medicine item
  // --------------------------------------------------

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        medicineId: "",
        quantity: "1",
        unitPrice: ""
      }
    ]);

    setError("");
  };

  // --------------------------------------------------
  // Remove medicine item
  // --------------------------------------------------

  const removeItem = (index) => {
    setItems((previous) => {
      if (previous.length === 1) {
        return previous;
      }

      return previous.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });

    setError("");
  };

  // --------------------------------------------------
  // Calculate totals
  // --------------------------------------------------

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      const medicine = medicines.find(
        (entry) =>
          String(entry.id) === String(item.medicineId)
      );

      return {
        ...item,
        medicine,
        numericQuantity: quantity,
        numericUnitPrice: unitPrice,
        total: quantity * unitPrice
      };
    });
  }, [items, medicines]);

  const totalAmount = useMemo(() => {
    return calculatedItems.reduce(
      (total, item) => total + item.total,
      0
    );
  }, [calculatedItems]);

  const totalUnits = useMemo(() => {
    return calculatedItems.reduce(
      (total, item) => total + item.numericQuantity,
      0
    );
  }, [calculatedItems]);

  const selectedMedicineCount = useMemo(() => {
    return items.filter((item) => item.medicineId).length;
  }, [items]);

  // --------------------------------------------------
  // Validate form
  // --------------------------------------------------

  const validateForm = () => {
    if (!formData.purchaseDate) {
      return "Purchase date is required.";
    }

    const parsedDate = new Date(
      `${formData.purchaseDate}T00:00:00`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return "Please select a valid purchase date.";
    }

    if (!formData.supplierId) {
      return "Please select a supplier.";
    }

    const selectedSupplier = suppliers.find(
      (supplier) =>
        String(supplier.id) === String(formData.supplierId)
    );

    if (!selectedSupplier) {
      return "The selected supplier is invalid. Please select a supplier again.";
    }

    if (items.length === 0) {
      return "Add at least one medicine to the purchase.";
    }

    const selectedMedicineIds = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemNumber = index + 1;

      if (!item.medicineId) {
        return `Please select a medicine for item ${itemNumber}.`;
      }

      const selectedMedicine = medicines.find(
        (medicine) =>
          String(medicine.id) === String(item.medicineId)
      );

      if (!selectedMedicine) {
        return `The medicine selected for item ${itemNumber} is invalid.`;
      }

      if (
        selectedMedicineIds.includes(
          String(item.medicineId)
        )
      ) {
        return `${selectedMedicine.name} appears more than once. Combine its quantity into one item.`;
      }

      selectedMedicineIds.push(
        String(item.medicineId)
      );

      const quantity = Number(item.quantity);

      if (
        item.quantity === "" ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return `Quantity for item ${itemNumber} must be a positive whole number.`;
      }

      const unitPrice = Number(item.unitPrice);

      if (
        item.unitPrice === "" ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return `Enter a valid non-negative unit price for item ${itemNumber}.`;
      }
    }

    if (!Number.isFinite(totalAmount)) {
      return "The purchase total is invalid. Check the quantities and prices.";
    }

    return "";
  };

  // --------------------------------------------------
  // Submit purchase
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");
    setCreatedPurchase(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    // The backend generates the official purchase number.
    // Do not send a manually entered purchase number.
    const payload = {
      purchaseDate: formData.purchaseDate,
      supplierId: Number(formData.supplierId),
      notes: formData.notes.trim() || null,
      items: items.map((item) => ({
        medicineId: Number(item.medicineId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice)
      }))
    };

    try {
      setSaving(true);

      const response = await api.post(
        "/purchases",
        payload
      );

      const responseData = response.data;

      const purchase =
        responseData?.purchase ||
        responseData?.data ||
        responseData;

      setCreatedPurchase(purchase);

      setSuccess(
        `Purchase ${purchase?.purchaseNumber || ""} created successfully.`.trim()
      );

      // Give the user time to see the confirmation.
      window.setTimeout(() => {
        navigate("/purchases");
      }, 1500);
    } catch (err) {
      console.error("Create purchase error:", err);

      const responseData = err.response?.data;

      let errorMessage = "Purchase creation failed.";

      if (Array.isArray(responseData?.errors)) {
        errorMessage = responseData.errors
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.message || JSON.stringify(item)
          )
          .join(" ");
      } else if (typeof responseData?.errors === "string") {
        errorMessage = responseData.errors;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Loading screen
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <Loader2
              size={28}
              className="animate-spin text-violet-400"
            />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />

            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading purchase form
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Preparing suppliers and medicines...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Main page
  // --------------------------------------------------

  return (
    <div className="relative min-h-full overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />

        <div className="absolute -left-40 top-1/3 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />

        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
      </div>

      <div className="space-y-6">
        {/* Page heading */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/purchases")}
              className="group mb-3 flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft
                size={16}
                className="transition-transform group-hover:-translate-x-0.5"
              />

              Back to Purchases
            </button>

            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
              Create New Purchase

              <Sparkles
                size={18}
                className="text-violet-400/70"
              />
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Record medicines purchased from a supplier.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-3 py-2 text-xs font-medium text-violet-300 md:self-center">
            <Hash size={14} />

            Automatic purchase numbering
          </div>
        </div>

        {/* Error message */}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent px-4 py-4 text-sm text-red-300 backdrop-blur-sm"
          >
            <div className="flex-1">
              <p className="font-semibold text-red-200">
                Unable to create purchase
              </p>

              <p className="mt-1 break-words">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Success message */}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-4 py-4 text-sm text-emerald-300 backdrop-blur-sm"
          >
            <CheckCircle2
              size={20}
              className="shrink-0"
            />

            <div>
              <p className="font-semibold">
                Purchase created successfully
              </p>

              <p className="mt-1">
                {success}
              </p>

              {createdPurchase?.purchaseNumber && (
                <p className="mt-2 font-semibold text-white">
                  Purchase Number:{" "}
                  {createdPurchase.purchaseNumber}
                </p>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Purchase information */}

          <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="mb-6 flex items-center gap-3">
              <IconBox className="bg-violet-500/10 text-violet-300">
                <Truck size={19} />
              </IconBox>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Purchase Information
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Select a supplier and enter the purchase details.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Automatic purchase number */}

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Purchase Number
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.05] px-4 py-3">
                  <Hash
                    size={17}
                    className="shrink-0 text-violet-400"
                  />

                  <div>
                    <p className="text-sm font-medium text-violet-200">
                      Generated automatically
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Assigned securely when you save.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase date */}

              <div>
                <label
                  htmlFor="purchaseDate"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Purchase Date
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="purchaseDate"
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3 pl-11 pr-4 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Supplier */}

              <div>
                <label
                  htmlFor="supplierId"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Supplier
                </label>

                <select
                  id="supplierId"
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  required
                  disabled={saving || suppliers.length === 0}
                  className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option
                    value=""
                    className="bg-[#111113]"
                  >
                    Select supplier
                  </option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                      className="bg-[#111113]"
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>

                {suppliers.length === 0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    No suppliers found. Add a supplier before creating a purchase.
                  </p>
                )}
              </div>

              {/* Notes */}

              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Notes
                  <span className="ml-2 font-normal text-zinc-600">
                    Optional
                  </span>
                </label>

                <input
                  id="notes"
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  maxLength={1000}
                  disabled={saving}
                  placeholder="Invoice reference or purchase notes"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {/* Purchase items */}

          <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <IconBox className="bg-fuchsia-500/10 text-fuchsia-300">
                  <Package size={19} />
                </IconBox>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Purchase Items
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Add the medicines being purchased.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={saving}
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus
                  size={16}
                  className="transition-transform group-hover:rotate-90"
                />

                Add Medicine
              </button>
            </div>

            <div className="space-y-4">
              {calculatedItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Item {index + 1}
                    </p>

                    {item.medicine?.sku && (
                      <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-xs text-zinc-500">
                        SKU: {item.medicine.sku}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
                    {/* Medicine */}

                    <div>
                      <label
                        htmlFor={`medicine-${index}`}
                        className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500"
                      >
                        Medicine
                      </label>

                      <select
                        id={`medicine-${index}`}
                        value={item.medicineId}
                        onChange={(event) =>
                          handleItemChange(
                            index,
                            "medicineId",
                            event.target.value
                          )
                        }
                        required
                        disabled={saving}
                        className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-60"
                      >
                        <option
                          value=""
                          className="bg-[#111113]"
                        >
                          Select medicine
                        </option>

                        {medicines.map((medicine) => (
                          <option
                            key={medicine.id}
                            value={medicine.id}
                            className="bg-[#111113]"
                          >
                            {medicine.name}
                            {medicine.strength
                              ? ` — ${medicine.strength}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}

                    <div>
                      <label
                        htmlFor={`quantity-${index}`}
                        className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500"
                      >
                        Quantity
                      </label>

                      <input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        required
                        disabled={saving}
                        className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-60"
                      />
                    </div>

                    {/* Unit price */}

                    <div>
                      <label
                        htmlFor={`unit-price-${index}`}
                        className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500"
                      >
                        Unit Price (GH₵)
                      </label>

                      <input
                        id={`unit-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleItemChange(
                            index,
                            "unitPrice",
                            event.target.value
                          )
                        }
                        required
                        disabled={saving}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-60"
                      />
                    </div>

                    {/* Remove item */}

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={saving || items.length === 1}
                      aria-label={`Remove item ${index + 1}`}
                      title={
                        items.length === 1
                          ? "At least one item is required"
                          : "Remove medicine"
                      }
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 text-red-400 transition hover:bg-red-500/[0.15] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Item total */}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-sm">
                    <span className="text-zinc-500">
                      {item.medicine?.name || "Select a medicine"}{" "}
                      · {item.numericQuantity} units
                    </span>

                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500">
                        Item Total
                      </span>

                      <span className="font-semibold text-white">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {medicines.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-sm text-amber-300">
                No medicines were found. Add medicines to your inventory catalogue before creating this purchase.
              </div>
            )}
          </section>

          {/* Summary cards */}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <IconBox
                  size="sm"
                  className="bg-violet-500/10 text-violet-300"
                >
                  <Package size={17} />
                </IconBox>

                <div>
                  <p className="text-xs text-zinc-500">
                    Purchase Lines
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {items.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <IconBox
                  size="sm"
                  className="bg-fuchsia-500/10 text-fuchsia-300"
                >
                  <Truck size={17} />
                </IconBox>

                <div>
                  <p className="text-xs text-zinc-500">
                    Selected Medicines
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {selectedMedicineCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <IconBox
                  size="sm"
                  className="bg-emerald-500/10 text-emerald-300"
                >
                  <Wallet size={17} />
                </IconBox>

                <div>
                  <p className="text-xs text-zinc-500">
                    Total Units
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {totalUnits.toLocaleString("en-GH")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Purchase total and actions */}

          <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-transparent p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Total Purchase Amount
                </p>

                <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                  {formatCurrency(totalAmount)}
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Final total is recalculated by the backend.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/purchases")}
                  disabled={saving}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    suppliers.length === 0 ||
                    medicines.length === 0 ||
                    Boolean(success)
                  }
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="relative animate-spin"
                      />

                      <span className="relative">
                        Creating Purchase...
                      </span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2
                        size={16}
                        className="relative"
                      />

                      <span className="relative">
                        Purchase Created
                      </span>
                    </>
                  ) : (
                    <>
                      <Save
                        size={16}
                        className="relative"
                      />

                      <span className="relative">
                        Create Purchase
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchase;
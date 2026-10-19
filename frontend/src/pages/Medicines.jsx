
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  Filter,
  Layers,
  Loader2,
  Package,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ======================================================
// Constants
// ======================================================

const EMPTY_FORM = {
  name: "",
  genericName: "",
  brandName: "",
  dosageForm: "",
  strength: "",
  description: "",
  imageUrl: "",
  barcode: "",
  reorderLevel: 10,
  isPrescriptionRequired: false,
  categoryId: "",
};

const COMMON_MEDICINES = [
  {
    name: "Paracetamol",
    genericName: "Paracetamol",
    brandName: "Panadol",
    dosageForm: "Tablet",
    strength: "500mg",
  },
  {
    name: "Paracetamol Suspension",
    genericName: "Paracetamol",
    brandName: "Panadol",
    dosageForm: "Suspension",
    strength: "120mg/5ml",
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    brandName: "",
    dosageForm: "Capsule",
    strength: "500mg",
  },
  {
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    brandName: "Brufen",
    dosageForm: "Tablet",
    strength: "400mg",
  },
  {
    name: "Cetirizine",
    genericName: "Cetirizine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "10mg",
  },
  {
    name: "Vitamin C",
    genericName: "Ascorbic Acid",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg",
  },
  {
    name: "Omeprazole",
    genericName: "Omeprazole",
    brandName: "",
    dosageForm: "Capsule",
    strength: "20mg",
  },
  {
    name: "Metformin",
    genericName: "Metformin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg",
  },
  {
    name: "Oral Rehydration Salts",
    genericName: "Oral Rehydration Salts",
    brandName: "",
    dosageForm: "Powder",
    strength: "",
  },
  {
    name: "Artemether/Lumefantrine",
    genericName: "Artemether/Lumefantrine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "20mg/120mg",
  },
  {
    name: "Amlodipine",
    genericName: "Amlodipine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "5mg",
  },
  {
    name: "Losartan",
    genericName: "Losartan",
    brandName: "",
    dosageForm: "Tablet",
    strength: "50mg",
  },
  {
    name: "Atorvastatin",
    genericName: "Atorvastatin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "20mg",
  },
  {
    name: "Diclofenac",
    genericName: "Diclofenac",
    brandName: "",
    dosageForm: "Tablet",
    strength: "50mg",
  },
  {
    name: "Loratadine",
    genericName: "Loratadine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "10mg",
  },
];

// ======================================================
// Styling
// ======================================================

const inputClasses =
  "w-full min-w-0 rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";

const selectClasses =
  "w-full min-w-0 rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";

const labelClasses =
  "mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-300";

const cardClasses =
  "rounded-2xl border border-[#343441] bg-[#22222E] shadow-lg shadow-black/10";

const panelClasses =
  "rounded-xl border border-[#3A3A49] bg-[#292936]";

const buttonClasses =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-[#555568] hover:bg-[#353544] disabled:cursor-not-allowed disabled:opacity-50";

const modalClasses =
  "relative z-10 mx-auto my-3 flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#3A3A49] bg-[#20202B] text-white shadow-2xl sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl";

const formatCurrency = (value) =>
  `GH₵ ${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  if (typeof message === "string") return message;

  if (message && typeof message === "object") {
    return JSON.stringify(message);
  }

  return fallback;
};

const getRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

// ======================================================
// Reusable Components
// ======================================================

const IconBox = ({ children, className = "" }) => (
  <div
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/[0.08] ${className}`}
  >
    {children}
  </div>
);

const MedicineImage = ({ src, alt, large = false }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const dimensions = large
    ? "h-24 w-24 sm:h-32 sm:w-32"
    : "h-12 w-12";

  if (!src || failed) {
    return (
      <div
        className={`${dimensions} flex shrink-0 items-center justify-center rounded-xl border border-[#3A3A49] bg-[#292936]`}
      >
        <Pill
          size={large ? 36 : 20}
          className="text-violet-400"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Medicine"}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${dimensions} shrink-0 rounded-xl border border-[#3A3A49] bg-[#292936] object-contain p-1.5`}
    />
  );
};

const StockBadge = ({ status, quantity }) => {
  const styles = {
    in_stock:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    low_stock:
      "border-amber-500/25 bg-amber-500/10 text-amber-300",
    out_of_stock:
      "border-rose-500/25 bg-rose-500/10 text-rose-300",
  };

  const labels = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
  };

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "border-[#3A3A49] bg-[#292936] text-neutral-300"
      }`}
    >
      <span>{Number(quantity || 0)} units</span>
      <span aria-hidden="true">·</span>
      <span>{labels[status] || "Unknown"}</span>
    </span>
  );
};

// ======================================================
// Medicines Page
// ======================================================

const Medicines = () => {
  const { user } = useAuth();

  const role = getRole(user?.role);

  // View-only access is granted to authenticated cashier accounts.
  const canViewMedicines = [
    "admin",
    "pharmacist",
    "inventory_manager",
    "cashier",
  ].includes(role);

  const canAddMedicine = [
    "admin",
    "pharmacist",
    "inventory_manager",
  ].includes(role);

  const canManageMedicines = [
    "admin",
    "pharmacist",
    "inventory_manager",
  ].includes(role);

  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ------------------------------------------------------
  // Data Loading
  // ------------------------------------------------------

  const fetchMedicines = useCallback(async () => {
    const response = await api.get("/medicines");

    if (response.data?.success === false) {
      throw new Error(
        response.data.message || "Unable to load medicines."
      );
    }

    setMedicines(response.data?.medicines || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const response = await api.get("/categories");

    if (response.data?.success === false) {
      throw new Error(
        response.data.message || "Unable to load categories."
      );
    }

    setCategories(response.data?.categories || []);
  }, []);

  const fetchInventory = useCallback(async () => {
    const response = await api.get("/inventory/summary");

    if (response.data?.success === false) {
      throw new Error(
        response.data.message || "Unable to load inventory."
      );
    }

    setInventory(response.data?.inventory || []);
  }, []);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        // Each request is handled separately so one unavailable
        // endpoint does not discard data returned by the others.
        const results = await Promise.allSettled([
          fetchMedicines(),
          fetchCategories(),
          fetchInventory(),
        ]);

        const medicineResult = results[0];

        if (medicineResult.status === "rejected") {
          throw medicineResult.reason;
        }

        const failedRequests = results
          .slice(1)
          .filter((result) => result.status === "rejected");

        if (failedRequests.length > 0) {
          console.error(
            "Some medicine page data could not be loaded:",
            failedRequests.map((result) => result.reason)
          );

          setNotice(
            "Medicine records loaded, but some category or inventory information may be unavailable."
          );
        }
      } catch (err) {
        console.error("Load medicines page error:", err);
        setError(
          getErrorMessage(err, "Unable to load medicine records.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchMedicines, fetchCategories, fetchInventory]
  );

  useEffect(() => {
    if (canViewMedicines) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canViewMedicines, loadData]);

  // ------------------------------------------------------
  // Inventory Lookup
  // ------------------------------------------------------

  const inventoryByMedicineId = useMemo(() => {
    return inventory.reduce((lookup, item) => {
      lookup[String(item.medicineId)] = item;
      return lookup;
    }, {});
  }, [inventory]);

  const getStockInfo = useCallback(
    (medicineId) =>
      inventoryByMedicineId[String(medicineId)] || {
        currentStock: 0,
        expiredQuantity: 0,
        stockStatus: "out_of_stock",
        inventoryValue: 0,
        retailValue: 0,
        potentialProfit: 0,
        batches: [],
      },
    [inventoryByMedicineId]
  );

  // ------------------------------------------------------
  // Medicine Suggestions
  // ------------------------------------------------------

  const medicineSuggestions = useMemo(() => {
    const search = form.name.trim().toLowerCase();

    if (!search || editingMedicine) return [];

    const existing = medicines.map((medicine) => ({
      name: medicine.name || "",
      genericName: medicine.genericName || "",
      brandName: medicine.brandName || "",
      dosageForm: medicine.dosageForm || "",
      strength: medicine.strength || "",
      source: "catalog",
    }));

    const combined = [
      ...existing,
      ...COMMON_MEDICINES.map((medicine) => ({
        ...medicine,
        source: "common",
      })),
    ];

    const seen = new Set();

    return combined
      .filter((medicine) => {
        const normalizedName = medicine.name.trim().toLowerCase();

        if (!normalizedName || seen.has(normalizedName)) {
          return false;
        }

        const matches = [
          medicine.name,
          medicine.genericName,
          medicine.brandName,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

        if (matches) seen.add(normalizedName);

        return matches;
      })
      .slice(0, 8);
  }, [form.name, medicines, editingMedicine]);

  // ------------------------------------------------------
  // Search and Filters
  // ------------------------------------------------------

  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const stock = getStockInfo(medicine.id);

      const matchesSearch =
        !search ||
        [
          medicine.name,
          medicine.genericName,
          medicine.brandName,
          medicine.sku,
          medicine.barcode,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const matchesCategory =
        selectedCategory === "all" ||
        String(medicine.categoryId) === String(selectedCategory);

      const matchesStock =
        selectedStockStatus === "all" ||
        stock.stockStatus === selectedStockStatus;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [
    medicines,
    searchTerm,
    selectedCategory,
    selectedStockStatus,
    getStockInfo,
  ]);

  const prescriptionCount = medicines.filter(
    (medicine) => medicine.isPrescriptionRequired
  ).length;

  const lowStockCount = inventory.filter(
    (item) => item.stockStatus === "low_stock"
  ).length;

  const outOfStockCount = inventory.filter(
    (item) => item.stockStatus === "out_of_stock"
  ).length;

  // ------------------------------------------------------
  // Form Management
  // ------------------------------------------------------

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (formError) setFormError("");
  };

  const openAddForm = () => {
    if (!canAddMedicine) return;

    setEditingMedicine(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowSuggestions(false);
    setShowForm(true);
  };

  const openEditForm = (medicine) => {
    if (!canManageMedicines) return;

    setEditingMedicine(medicine);

    setForm({
      name: medicine.name || "",
      genericName: medicine.genericName || "",
      brandName: medicine.brandName || "",
      dosageForm: medicine.dosageForm || "",
      strength: medicine.strength || "",
      description: medicine.description || "",
      imageUrl: medicine.imageUrl || "",
      barcode: medicine.barcode || "",
      reorderLevel: medicine.reorderLevel ?? 10,
      isPrescriptionRequired: Boolean(
        medicine.isPrescriptionRequired
      ),
      categoryId: medicine.categoryId
        ? String(medicine.categoryId)
        : "",
    });

    setFormError("");
    setShowSuggestions(false);
    setShowDetails(false);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingMedicine(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setShowSuggestions(false);
  };

  const selectSuggestion = (suggestion) => {
    setForm((current) => ({
      ...current,
      name: suggestion.name,
      genericName: suggestion.genericName || "",
      brandName: suggestion.brandName || "",
      dosageForm: suggestion.dosageForm || "",
      strength: suggestion.strength || "",
    }));

    setShowSuggestions(false);
    setFormError("");
  };

  // ------------------------------------------------------
  // Validation
  // ------------------------------------------------------

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Please enter a medicine name.";
    }

    if (!form.categoryId) {
      return "Please select a medicine category.";
    }

    if (!form.dosageForm.trim()) {
      return "Please enter the dosage form.";
    }

    if (
      form.reorderLevel === "" ||
      !Number.isFinite(Number(form.reorderLevel)) ||
      Number(form.reorderLevel) < 0
    ) {
      return "Reorder level must be a valid non-negative number.";
    }

    if (
      !Number.isInteger(Number(form.reorderLevel))
    ) {
      return "Reorder level must be a whole number.";
    }

    const imageUrl = form.imageUrl.trim();

    if (imageUrl) {
      try {
        const parsedUrl = new URL(imageUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return "Image URL must use HTTP or HTTPS.";
        }
      } catch {
        return "Please enter a valid image URL.";
      }
    }

    return "";
  };

  // ------------------------------------------------------
  // Create / Update Medicine
  // ------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (editingMedicine && !canManageMedicines) {
      setFormError("You do not have permission to edit medicines.");
      return;
    }

    if (!editingMedicine && !canAddMedicine) {
      setFormError("You do not have permission to add medicines.");
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    setShowSuggestions(false);

    try {
      const payload = {
        name: form.name.trim(),
        genericName: form.genericName.trim(),
        brandName: form.brandName.trim(),
        dosageForm: form.dosageForm.trim(),
        strength: form.strength.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        reorderLevel: Number(form.reorderLevel),
        isPrescriptionRequired: Boolean(
          form.isPrescriptionRequired
        ),
        categoryId: form.categoryId,
      };

      const response = editingMedicine
        ? await api.put(
            `/medicines/${editingMedicine.id}`,
            payload
          )
        : await api.post("/medicines", payload);

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to save medicine."
        );
      }

      closeForm();

      setNotice(
        editingMedicine
          ? "Medicine details updated successfully."
          : "Medicine registered successfully."
      );

      await Promise.allSettled([
        fetchMedicines(),
        fetchInventory(),
      ]);
    } catch (err) {
      console.error("Save medicine error:", err);

      setFormError(
        getErrorMessage(err, "Unable to save medicine.")
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------
  // Deactivate Medicine
  // ------------------------------------------------------

  const handleDeactivate = async (medicine) => {
    if (!canManageMedicines || deletingId !== null) return;

    const confirmed = window.confirm(
      `Deactivate "${medicine.name}"? It may no longer be available for normal use.`
    );

    if (!confirmed) return;

    setDeletingId(medicine.id);
    setError("");
    setNotice("");

    try {
      const response = await api.delete(
        `/medicines/${medicine.id}`
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to deactivate medicine."
        );
      }

      if (selectedMedicine?.id === medicine.id) {
        setSelectedMedicine(null);
        setShowDetails(false);
      }

      setNotice("Medicine deactivated successfully.");

      await Promise.allSettled([
        fetchMedicines(),
        fetchInventory(),
      ]);
    } catch (err) {
      console.error("Deactivate medicine error:", err);

      setError(
        getErrorMessage(err, "Unable to deactivate medicine.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ------------------------------------------------------
  // Details
  // ------------------------------------------------------

  const openDetails = (medicine) => {
    setSelectedMedicine(medicine);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setSelectedMedicine(null);
    setShowDetails(false);
  };

  const getCategoryName = (medicine) =>
    categories.find(
      (category) =>
        String(category.id) === String(medicine.categoryId)
    )?.name || "Uncategorized";

  // ------------------------------------------------------
  // Access Control
  // ------------------------------------------------------

  if (!canViewMedicines) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#171721] px-4 text-white">
        <div className={`${cardClasses} max-w-md p-8 text-center`}>
          <IconBox className="mx-auto mb-4 bg-amber-500/10 text-amber-300">
            <AlertTriangle size={22} />
          </IconBox>

          <h1 className="text-xl font-bold">
            Access restricted
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            Your account does not have permission to view the medicine catalog.
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------
  // Loading State
  // ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#171721] px-4 text-white">
        <div className={`${cardClasses} flex flex-col items-center gap-4 p-8`}>
          <Loader2
            size={32}
            className="animate-spin text-violet-400"
          />

          <p className="text-sm text-neutral-300">
            Loading medicine catalog...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // Main Render
  // ======================================================

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-clip bg-[#171721] pb-10 text-white">
      <div className="space-y-5 sm:space-y-7">
        {/* Header */}
        <section className={`${cardClasses} relative overflow-hidden p-4 sm:p-7`}>
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-violet-500/[0.07] blur-3xl" />

          <div className="relative flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-[#292936] px-3 py-1 text-xs font-semibold text-violet-300">
                <Sparkles size={13} />
                PharmaCore Medicine Hub
              </span>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
                Medicines{" "}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  &amp; Catalog
                </span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-300">
                Search medicine records, monitor stock status, and review
                pharmaceutical product information.
              </p>

              {!canManageMedicines && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <Eye size={15} />
                  View-only access: medicine records cannot be changed.
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className={buttonClasses}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              {canAddMedicine && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-600/30"
                >
                  <Plus size={18} />
                  Add Medicine
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>

            <button
              type="button"
              onClick={() => loadData(true)}
              className="shrink-0 rounded-lg border border-rose-500/30 px-3 py-2 font-semibold hover:bg-rose-500/10"
            >
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span className="break-words">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto shrink-0 rounded p-1 hover:bg-emerald-500/10"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: "Total Medicines",
              value: medicines.length,
              icon: Pill,
              color: "text-violet-300 bg-violet-500/10",
            },
            {
              label: "Prescription Only",
              value: prescriptionCount,
              icon: Filter,
              color: "text-amber-300 bg-amber-500/10",
            },
            {
              label: "Low Stock",
              value: lowStockCount,
              icon: AlertTriangle,
              color: "text-orange-300 bg-orange-500/10",
            },
            {
              label: "Out of Stock",
              value: outOfStockCount,
              icon: Package,
              color: "text-rose-300 bg-rose-500/10",
            },
            {
              label: "Categories",
              value: categories.length,
              icon: Layers,
              color: "text-emerald-300 bg-emerald-500/10",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`${cardClasses} min-w-0 p-3 sm:p-5`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
                    {item.label}
                  </p>

                  <p className="mt-2 text-2xl font-black sm:text-3xl">
                    {item.value}
                  </p>
                </div>

                <IconBox className={item.color}>
                  <item.icon size={19} />
                </IconBox>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <section className={`${cardClasses} p-3 sm:p-5`}>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_16rem_14rem]">
            <div className="relative min-w-0">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, brand, SKU or barcode..."
                className={`${inputClasses} pl-11`}
                aria-label="Search medicines"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className={selectClasses}
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStockStatus}
              onChange={(event) =>
                setSelectedStockStatus(event.target.value)
              }
              className={selectClasses}
              aria-label="Filter by stock status"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </section>

        {/* Catalog */}
        <section className={`${cardClasses} min-w-0 overflow-hidden`}>
          <div className="flex flex-col justify-between gap-3 border-b border-[#373744] p-4 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-bold">
                Medicine Catalog
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Showing {filteredMedicines.length} of {medicines.length} records
              </p>
            </div>

            <span className="w-fit rounded-lg border border-[#3A3A49] bg-[#292936] px-3 py-2 text-xs font-semibold text-neutral-200">
              {filteredMedicines.length} results
            </span>
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
              <IconBox className="mb-4 h-16 w-16 rounded-2xl bg-[#292936] text-neutral-400">
                <Pill size={28} />
              </IconBox>

              <h3 className="text-base font-bold">
                No medicines found
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-300">
                Try another search term or change the selected filters.
              </p>

              {medicines.length === 0 && canAddMedicine && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-3 text-sm font-semibold hover:bg-violet-600/30"
                >
                  <Plus size={17} />
                  Add First Medicine
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="grid gap-3 p-3 md:hidden">
                {filteredMedicines.map((medicine) => {
                  const stock = getStockInfo(medicine.id);

                  return (
                    <article
                      key={medicine.id}
                      className="min-w-0 rounded-2xl border border-[#3A3A49] bg-[#292936] p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <MedicineImage
                          src={medicine.imageUrl}
                          alt={medicine.name}
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-bold">
                            {medicine.name}
                          </h3>

                          <p className="mt-1 break-words text-xs text-neutral-300">
                            {medicine.genericName || "Generic name not specified"}
                          </p>

                          {medicine.brandName && (
                            <p className="mt-1 break-words text-xs text-neutral-400">
                              Brand: {medicine.brandName}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-neutral-400">
                            {getCategoryName(medicine)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#41414F] pt-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            Dosage / Strength
                          </p>
                          <p className="mt-1 break-words text-xs font-medium">
                            {medicine.dosageForm || "—"}
                            {medicine.strength ? ` · ${medicine.strength}` : ""}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            SKU
                          </p>
                          <p className="mt-1 break-all font-mono text-xs">
                            {medicine.sku || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            Current Stock
                          </p>
                          <div className="mt-1">
                            <StockBadge
                              status={stock.stockStatus}
                              quantity={stock.currentStock}
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase text-neutral-400">
                            Prescription
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              medicine.isPrescriptionRequired
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            }`}
                          >
                            {medicine.isPrescriptionRequired
                              ? "Required"
                              : "OTC"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#41414F] pt-3">
                        <button
                          type="button"
                          onClick={() => openDetails(medicine)}
                          className={buttonClasses}
                        >
                          <Eye size={15} />
                          View
                        </button>

                        {canManageMedicines && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(medicine)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
                            >
                              <Edit3 size={15} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeactivate(medicine)}
                              disabled={deletingId !== null}
                              className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              {deletingId === medicine.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                              Deactivate Medicine
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-[#292936]">
                    <tr className="border-b border-[#373744]">
                      {[
                        "Medicine",
                        "Category",
                        "Dosage",
                        "SKU",
                        "Stock",
                        "Prescription",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-300"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#373744]">
                    {filteredMedicines.map((medicine) => {
                      const stock = getStockInfo(medicine.id);

                      return (
                        <tr
                          key={medicine.id}
                          className="transition hover:bg-[#292936]/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <MedicineImage
                                src={medicine.imageUrl}
                                alt={medicine.name}
                              />

                              <div className="min-w-0">
                                <p className="font-semibold">
                                  {medicine.name}
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  {medicine.genericName || medicine.brandName || "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-neutral-200">
                            {getCategoryName(medicine)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm">
                              {medicine.dosageForm || "—"}
                            </p>
                            <p className="mt-1 text-xs text-neutral-400">
                              {medicine.strength || "Not specified"}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-mono text-xs">
                            {medicine.sku || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <StockBadge
                              status={stock.stockStatus}
                              quantity={stock.currentStock}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                medicine.isPrescriptionRequired
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {medicine.isPrescriptionRequired
                                ? "Required"
                                : "OTC"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openDetails(medicine)}
                                className="rounded-lg border border-[#3A3A49] p-2 text-neutral-200 hover:bg-[#353544]"
                                title="View medicine"
                                aria-label={`View ${medicine.name}`}
                              >
                                <Eye size={16} />
                              </button>

                              {canManageMedicines && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(medicine)}
                                    className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-violet-200 hover:bg-violet-500/20"
                                    title="Edit medicine"
                                    aria-label={`Edit ${medicine.name}`}
                                  >
                                    <Edit3 size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeactivate(medicine)}
                                    disabled={deletingId !== null}
                                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                                    title="Deactivate medicine"
                                    aria-label={`Deactivate ${medicine.name}`}
                                  >
                                    {deletingId === medicine.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
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
      </div>

      {/* ======================================================
          Create / Edit Medicine Modal
      ====================================================== */}

      {showForm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6">
            <button
              type="button"
              aria-label="Close medicine form"
              className="fixed inset-0 h-full w-full cursor-default"
              onClick={closeForm}
              disabled={saving}
            />

            <div className={`${modalClasses} sm:max-w-4xl`}>
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#373744] px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                    Medicine Management
                  </p>

                  <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">
                    {editingMedicine ? "Edit Medicine" : "Register Medicine"}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-300">
                    Enter the medicine details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-[#3A3A49] p-2 text-neutral-300 hover:bg-[#353544] disabled:opacity-50"
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>
              </header>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                  {formError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"
                    >
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <p className="break-words">{formError}</p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Medicine Name */}
                    <div className="relative sm:col-span-2">
                      <label className={labelClasses}>
                        Medicine Name *
                      </label>

                      <input
                        name="name"
                        value={form.name}
                        onChange={(event) => {
                          handleChange(event);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        required
                        autoComplete="off"
                        placeholder="e.g. Paracetamol"
                        className={inputClasses}
                      />

                      {showSuggestions && medicineSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#3A3A49] bg-[#292936] shadow-2xl">
                          {medicineSuggestions.map((suggestion, index) => (
                            <button
                              key={`${suggestion.name}-${index}`}
                              type="button"
                              onClick={() => selectSuggestion(suggestion)}
                              className="block w-full border-b border-[#41414F] px-4 py-3 text-left last:border-0 hover:bg-[#383847]"
                            >
                              <span className="block text-sm font-semibold">
                                {suggestion.name}
                              </span>
                              <span className="mt-1 block text-xs text-neutral-400">
                                {suggestion.dosageForm} {suggestion.strength}
                                {suggestion.brandName
                                  ? ` · ${suggestion.brandName}`
                                  : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelClasses}>Generic Name</label>
                      <input
                        name="genericName"
                        value={form.genericName}
                        onChange={handleChange}
                        placeholder="Generic name"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>Brand Name</label>
                      <input
                        name="brandName"
                        value={form.brandName}
                        onChange={handleChange}
                        placeholder="Brand name"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>Category *</label>
                      <select
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        required
                        className={selectClasses}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={String(category.id)}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClasses}>Dosage Form *</label>
                      <input
                        name="dosageForm"
                        value={form.dosageForm}
                        onChange={handleChange}
                        required
                        placeholder="Tablet, capsule, syrup..."
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>Strength</label>
                      <input
                        name="strength"
                        value={form.strength}
                        onChange={handleChange}
                        placeholder="e.g. 500mg"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>SKU</label>
                      <input
                        value={editingMedicine?.sku || ""}
                        readOnly
                        placeholder="Generated automatically"
                        className={`${inputClasses} cursor-not-allowed opacity-80`}
                      />
                      <p className="mt-2 text-xs text-neutral-400">
                        PharmaCore generates the SKU when a medicine is saved.
                      </p>
                    </div>

                    <div>
                      <label className={labelClasses}>Barcode</label>
                      <input
                        name="barcode"
                        value={form.barcode}
                        onChange={handleChange}
                        placeholder="Barcode number"
                        className={`${inputClasses} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>
                        Reorder Level *
                      </label>
                      <input
                        name="reorderLevel"
                        type="number"
                        min="0"
                        step="1"
                        value={form.reorderLevel}
                        onChange={handleChange}
                        required
                        className={inputClasses}
                      />
                      <p className="mt-2 text-xs text-neutral-400">
                        Receive a low-stock alert when stock reaches this level.
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClasses}>Image URL</label>
                      <input
                        name="imageUrl"
                        type="url"
                        value={form.imageUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/medicine.png"
                        className={inputClasses}
                      />

                      {form.imageUrl.trim() && (
                        <div className={`${panelClasses} mt-3 p-3`}>
                          <p className="mb-2 text-xs font-semibold text-neutral-300">
                            Image Preview
                          </p>
                          <MedicineImage
                            src={form.imageUrl.trim()}
                            alt="Medicine preview"
                            large
                          />
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClasses}>
                        Description / Clinical Notes
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Optional medicine details..."
                        className={`${inputClasses} resize-y`}
                      />
                    </div>

                    <label
                      className={`${panelClasses} flex cursor-pointer items-start gap-3 p-4 sm:col-span-2`}
                    >
                      <input
                        type="checkbox"
                        name="isPrescriptionRequired"
                        checked={form.isPrescriptionRequired}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
                      />

                      <span>
                        <span className="block text-sm font-semibold">
                          Prescription Required
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-neutral-400">
                          Mark this medicine as requiring a prescription before
                          dispensing.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#373744] p-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className={buttonClasses}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-3 text-sm font-semibold hover:bg-violet-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    {saving
                      ? "Saving..."
                      : editingMedicine
                        ? "Save Changes"
                        : "Register Medicine"}
                  </button>
                </footer>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================
          Medicine Details Modal
      ====================================================== */}

      {showDetails &&
        selectedMedicine &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6">
            <button
              type="button"
              aria-label="Close medicine details"
              className="fixed inset-0 h-full w-full cursor-default"
              onClick={closeDetails}
            />

            <div className={`${modalClasses} sm:max-w-2xl`}>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#373744] p-4 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                    Medicine Record
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Medicine Details
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-xl border border-[#3A3A49] p-2 hover:bg-[#353544]"
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <MedicineImage
                    src={selectedMedicine.imageUrl}
                    alt={selectedMedicine.name}
                    large
                  />

                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-black">
                      {selectedMedicine.name}
                    </h3>

                    <p className="mt-1 break-words text-sm text-violet-300">
                      {selectedMedicine.genericName || "Generic name not specified"}
                      {selectedMedicine.brandName
                        ? ` · ${selectedMedicine.brandName}`
                        : ""}
                    </p>

                    <p className="mt-2 text-sm text-neutral-300">
                      {getCategoryName(selectedMedicine)}
                    </p>

                    <p className="mt-1 text-sm text-neutral-300">
                      {selectedMedicine.dosageForm || "Dosage form not specified"}
                      {selectedMedicine.strength
                        ? ` · ${selectedMedicine.strength}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${panelClasses} p-4`}>
                    <p className="text-xs font-semibold uppercase text-neutral-400">
                      SKU
                    </p>
                    <p className="mt-2 break-all font-mono text-sm">
                      {selectedMedicine.sku || "Not assigned"}
                    </p>
                  </div>

                  <div className={`${panelClasses} p-4`}>
                    <p className="text-xs font-semibold uppercase text-neutral-400">
                      Barcode
                    </p>
                    <p className="mt-2 break-all font-mono text-sm">
                      {selectedMedicine.barcode || "Not assigned"}
                    </p>
                  </div>

                  <div className={`${panelClasses} p-4`}>
                    <p className="text-xs font-semibold uppercase text-neutral-400">
                      Prescription
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {selectedMedicine.isPrescriptionRequired
                        ? "Prescription required"
                        : "Over-the-counter"}
                    </p>
                  </div>

                  <div className={`${panelClasses} p-4`}>
                    <p className="text-xs font-semibold uppercase text-neutral-400">
                      Reorder Level
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {selectedMedicine.reorderLevel ?? 10} units
                    </p>
                  </div>
                </div>

                {selectedMedicine.description && (
                  <div className={`${panelClasses} p-4`}>
                    <h3 className="text-xs font-semibold uppercase text-neutral-400">
                      Description / Clinical Notes
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
                      {selectedMedicine.description}
                    </p>
                  </div>
                )}

                {(() => {
                  const stock = getStockInfo(selectedMedicine.id);

                  return (
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-violet-300">
                        Inventory Overview
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className={`${panelClasses} p-4`}>
                          <p className="text-xs text-neutral-400">
                            Current Stock
                          </p>
                          <p className="mt-2 text-xl font-black">
                            {stock.currentStock} units
                          </p>
                        </div>

                        <div className={`${panelClasses} p-4`}>
                          <p className="text-xs text-neutral-400">
                            Inventory Value
                          </p>
                          <p className="mt-2 break-words text-base font-bold">
                            {formatCurrency(stock.inventoryValue)}
                          </p>
                        </div>

                        <div className={`${panelClasses} p-4`}>
                          <p className="text-xs text-neutral-400">
                            Potential Profit
                          </p>
                          <p className="mt-2 break-words text-base font-bold text-emerald-300">
                            {formatCurrency(stock.potentialProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <footer className="flex flex-col-reverse gap-2 border-t border-[#373744] pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDetails}
                    className={buttonClasses}
                  >
                    Close
                  </button>

                  {canManageMedicines && (
                    <button
                      type="button"
                      onClick={() => openEditForm(selectedMedicine)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
                    >
                      <Edit3 size={16} />
                      Edit Medicine
                    </button>
                  )}
                </footer>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Medicines;
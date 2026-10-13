
import {
  AlertTriangle,
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
  X
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";

// ======================================================
// Constants
// ======================================================

const emptyForm = {
  name: "",
  genericName: "",
  brandName: "",
  dosageForm: "",
  strength: "",
  description: "",
  imageUrl: "",
  sku: "",
  barcode: "",
  reorderLevel: 10,
  isPrescriptionRequired: false,
  categoryId: ""
};

const COMMON_MEDICINES = [
  {
    name: "Paracetamol",
    genericName: "Paracetamol",
    brandName: "Panadol",
    dosageForm: "Tablet",
    strength: "500mg"
  },
  {
    name: "Paracetamol Suspension",
    genericName: "Paracetamol",
    brandName: "Panadol",
    dosageForm: "Suspension",
    strength: "120mg/5ml"
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    brandName: "",
    dosageForm: "Capsule",
    strength: "500mg"
  },
  {
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    brandName: "Brufen",
    dosageForm: "Tablet",
    strength: "400mg"
  },
  {
    name: "Cetirizine",
    genericName: "Cetirizine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "10mg"
  },
  {
    name: "Vitamin C",
    genericName: "Ascorbic Acid",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg"
  },
  {
    name: "Omeprazole",
    genericName: "Omeprazole",
    brandName: "",
    dosageForm: "Capsule",
    strength: "20mg"
  },
  {
    name: "Metformin",
    genericName: "Metformin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg"
  },
  {
    name: "Oral Rehydration Salts",
    genericName: "Oral Rehydration Salts",
    brandName: "",
    dosageForm: "Powder",
    strength: ""
  },
  {
    name: "Artemether/Lumefantrine",
    genericName: "Artemether/Lumefantrine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "20mg/120mg"
  },
  {
    name: "Amlodipine",
    genericName: "Amlodipine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "5mg"
  },
  {
    name: "Losartan",
    genericName: "Losartan",
    brandName: "",
    dosageForm: "Tablet",
    strength: "50mg"
  },
  {
    name: "Atorvastatin",
    genericName: "Atorvastatin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "20mg"
  },
  {
    name: "Diclofenac",
    genericName: "Diclofenac",
    brandName: "",
    dosageForm: "Tablet",
    strength: "50mg"
  },
  {
    name: "Loratadine",
    genericName: "Loratadine",
    brandName: "",
    dosageForm: "Tablet",
    strength: "10mg"
  },
  {
    name: "Azithromycin",
    genericName: "Azithromycin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg"
  },
  {
    name: "Ciprofloxacin",
    genericName: "Ciprofloxacin",
    brandName: "",
    dosageForm: "Tablet",
    strength: "500mg"
  },
  {
    name: "Co-trimoxazole",
    genericName: "Sulfamethoxazole/Trimethoprim",
    brandName: "",
    dosageForm: "Tablet",
    strength: "800mg/160mg"
  },
  {
    name: "Ferrous Sulphate",
    genericName: "Ferrous Sulphate",
    brandName: "",
    dosageForm: "Tablet",
    strength: "200mg"
  },
  {
    name: "Folic Acid",
    genericName: "Folic Acid",
    brandName: "",
    dosageForm: "Tablet",
    strength: "5mg"
  }
];

// ======================================================
// Charcoal Theme Styles
// ======================================================

const inputClasses =
  "w-full min-w-0 rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-400 hover:border-[#555568] focus:border-violet-400 focus:bg-[#292936] focus:ring-2 focus:ring-violet-500/20";

const selectClasses =
  "w-full min-w-0 cursor-pointer rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm text-white outline-none transition hover:border-[#555568] focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";

const labelClasses =
  "mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-300";

const secondaryButtonClasses =
  "rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-[#555568] hover:bg-[#353544] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

const closeButtonClasses =
  "rounded-xl border border-[#3A3A49] bg-[#292936] p-2 text-neutral-300 transition hover:border-[#555568] hover:bg-[#353544] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

const modalClasses =
  "relative mx-auto my-4 flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#3A3A49] bg-[#20202B] text-white shadow-2xl shadow-black/40 sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl";

const modalHeaderClasses =
  "flex shrink-0 items-start justify-between gap-3 border-b border-[#373744] bg-[#20202B] px-4 py-4 sm:px-6";

const modalFooterClasses =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-[#373744] bg-[#20202B] px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6";

const cardClasses =
  "rounded-2xl border border-[#343441] bg-[#22222E] shadow-lg shadow-black/10";

const innerPanelClasses =
  "rounded-xl border border-[#3A3A49] bg-[#292936]";

const regularButtonClasses =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#3A3A49] bg-[#292936] p-2 text-neutral-200 transition hover:border-[#555568] hover:bg-[#353544] hover:text-white";

// ======================================================
// Icon Box
// ======================================================

const IconBox = ({ children, className = "", size = "md" }) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-lg"
      : size === "lg"
        ? "h-12 w-12 rounded-xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.08] ${className}`}
    >
      {children}
    </div>
  );
};

// ======================================================
// Medicine Image
// ======================================================

const MedicineImage = ({
  src,
  alt,
  size = "small",
  className = ""
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const imageSize =
    size === "large"
      ? "h-24 w-24 sm:h-36 sm:w-36"
      : size === "medium"
        ? "h-14 w-14"
        : "h-11 w-11";

  if (!src || imageFailed) {
    return (
      <div
        className={`${imageSize} ${className} flex shrink-0 items-center justify-center rounded-xl border border-[#3A3A49] bg-[#292936]`}
      >
        <Pill
          size={size === "large" ? 40 : size === "medium" ? 24 : 18}
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
      onError={() => setImageFailed(true)}
      className={`${imageSize} ${className} shrink-0 rounded-xl border border-[#3A3A49] bg-[#292936] object-contain p-1.5`}
    />
  );
};

// ======================================================
// Medicines Page
// ======================================================

const Medicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [showMedicineSuggestions, setShowMedicineSuggestions] =
    useState(false);

  // ------------------------------------------------------
  // Fetch Medicines
  // ------------------------------------------------------

  const fetchMedicines = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/medicines");

      if (response.data.success) {
        setMedicines(response.data.medicines || []);
      } else {
        setError(response.data.message || "Unable to fetch medicines.");
      }
    } catch (err) {
      console.error("Fetch medicines error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to connect to the medicines service."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ------------------------------------------------------
  // Fetch Categories
  // ------------------------------------------------------

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");

      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  // ------------------------------------------------------
  // Fetch Inventory
  // ------------------------------------------------------

  const fetchInventory = async () => {
    try {
      const response = await api.get("/inventory/summary");

      if (response.data.success) {
        setInventory(response.data.inventory || []);
      }
    } catch (err) {
      console.error("Fetch inventory error:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchMedicines(),
        fetchCategories(),
        fetchInventory()
      ]);
    };

    loadData();
  }, []);

  // ------------------------------------------------------
  // Inventory Lookup
  // ------------------------------------------------------

  const inventoryByMedicineId = useMemo(() => {
    return inventory.reduce((lookup, item) => {
      lookup[item.medicineId] = item;
      return lookup;
    }, {});
  }, [inventory]);

  // ------------------------------------------------------
  // Medicine Suggestions
  // ------------------------------------------------------

  const medicineSuggestions = useMemo(() => {
    const search = form.name.trim().toLowerCase();

    if (!search) return [];

    const existing = medicines.map((med) => ({
      id: med.id,
      name: med.name || "",
      genericName: med.genericName || "",
      brandName: med.brandName || "",
      dosageForm: med.dosageForm || "",
      strength: med.strength || "",
      source: "catalog"
    }));

    const combined = [
      ...existing,
      ...COMMON_MEDICINES.map((med) => ({
        ...med,
        source: "common"
      }))
    ];

    const seenNames = new Set();

    return combined
      .filter((med) => {
        const normName = med.name.trim().toLowerCase();

        if (!normName || seenNames.has(normName)) return false;

        const matches = [
          med.name,
          med.genericName,
          med.brandName
        ].some((value) => value?.toLowerCase().includes(search));

        if (!matches) return false;

        seenNames.add(normName);
        return true;
      })
      .slice(0, 8);
  }, [form.name, medicines]);

  // ------------------------------------------------------
  // Filter Medicines
  // ------------------------------------------------------

  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const medicineInventory = inventoryByMedicineId[medicine.id];
      const stockStatus =
        medicineInventory?.stockStatus || "out_of_stock";

      const matchesSearch =
        !search ||
        medicine.name?.toLowerCase().includes(search) ||
        medicine.genericName?.toLowerCase().includes(search) ||
        medicine.brandName?.toLowerCase().includes(search) ||
        medicine.sku?.toLowerCase().includes(search) ||
        medicine.barcode?.toLowerCase().includes(search);

      const matchesCategory =
        selectedCategory === "all" ||
        String(medicine.categoryId) === String(selectedCategory);

      const matchesStock =
        selectedStockStatus === "all" ||
        stockStatus === selectedStockStatus;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [
    medicines,
    searchTerm,
    selectedCategory,
    selectedStockStatus,
    inventoryByMedicineId
  ]);

  // ------------------------------------------------------
  // Dashboard Metrics
  // ------------------------------------------------------

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
  // Form Handlers
  // ------------------------------------------------------

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const selectMedicineSuggestion = (suggestion) => {
    setForm((current) => ({
      ...current,
      name: suggestion.name,
      genericName: suggestion.genericName || "",
      brandName: suggestion.brandName || "",
      dosageForm: suggestion.dosageForm || "",
      strength: suggestion.strength || ""
    }));

    setShowMedicineSuggestions(false);
    setFormError("");
  };

  const openAddForm = () => {
    setEditingMedicine(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowMedicineSuggestions(false);
    setShowForm(true);
  };

  const openEditForm = (medicine) => {
    setEditingMedicine(medicine);

    setForm({
      name: medicine.name || "",
      genericName: medicine.genericName || "",
      brandName: medicine.brandName || "",
      dosageForm: medicine.dosageForm || "",
      strength: medicine.strength || "",
      description: medicine.description || "",
      imageUrl: medicine.imageUrl || "",
      sku: medicine.sku || "",
      barcode: medicine.barcode || "",
      reorderLevel: medicine.reorderLevel ?? 10,
      isPrescriptionRequired: Boolean(medicine.isPrescriptionRequired),
      // normalize to string to match select option values
      categoryId: medicine.categoryId ? String(medicine.categoryId) : ""
    });

    setFormError("");
    setShowMedicineSuggestions(false);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingMedicine(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowMedicineSuggestions(false);
  };

  // ------------------------------------------------------
  // Create / Update Medicine
  // ------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setShowMedicineSuggestions(false);

    if (!form.categoryId) {
      setFormError("Please select a medicine category.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Please enter a medicine name.");
      return;
    }

    if (!form.dosageForm.trim()) {
      setFormError("Please enter the dosage form.");
      return;
    }

    if (
      form.reorderLevel === "" ||
      !Number.isFinite(Number(form.reorderLevel)) ||
      Number(form.reorderLevel) < 0
    ) {
      setFormError("Reorder level must be a valid non-negative number.");
      return;
    }

    const cleanedImageUrl = form.imageUrl.trim();

    if (cleanedImageUrl) {
      try {
        const parsedUrl = new URL(cleanedImageUrl);

        if (
          parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:"
        ) {
          setFormError(
            "The image URL must start with http:// or https://."
          );
          return;
        }
      } catch {
        setFormError("Please enter a valid image URL.");
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        genericName: form.genericName.trim(),
        brandName: form.brandName.trim(),
        dosageForm: form.dosageForm.trim(),
        strength: form.strength.trim(),
        description: form.description.trim(),
        imageUrl: cleanedImageUrl || undefined,
        barcode: form.barcode.trim() || undefined,
        reorderLevel: Number(form.reorderLevel),
        isPrescriptionRequired: Boolean(form.isPrescriptionRequired),
        // send categoryId as-is (string or numeric string). Avoid Number(...) which may produce NaN.
        categoryId: form.categoryId
      };

      const response = editingMedicine
        ? await api.put(`/medicines/${editingMedicine.id}`, payload)
        : await api.post("/medicines", payload);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Unable to save medicine."
        );
      }

      setShowForm(false);
      setEditingMedicine(null);
      setForm({ ...emptyForm });
      setFormError("");

      await Promise.all([
        fetchMedicines(true),
        fetchInventory()
      ]);
    } catch (err) {
      console.error("Save medicine error:", err);
      console.error("Backend response:", err.response?.status, err.response?.data);

      const serverMessage =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Unable to save medicine.";

      setFormError(
        typeof serverMessage === "string"
          ? serverMessage
          : JSON.stringify(serverMessage)
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------
  // Deactivate Medicine
  // ------------------------------------------------------

  const handleDeactivate = async (medicine) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${medicine.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(medicine.id);

      const response = await api.delete(`/medicines/${medicine.id}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Unable to deactivate medicine."
        );
      }

      if (selectedMedicine?.id === medicine.id) {
        setSelectedMedicine(null);
        setShowDetails(false);
      }

      await Promise.all([
        fetchMedicines(true),
        fetchInventory()
      ]);
    } catch (err) {
      console.error("Deactivate medicine error:", err);

      window.alert(
        err.response?.data?.message ||
          err.message ||
          "Unable to deactivate medicine."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openDetails = (medicine) => {
    setSelectedMedicine(medicine);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setSelectedMedicine(null);
    setShowDetails(false);
  };

  // ------------------------------------------------------
  // Inventory Helpers
  // ------------------------------------------------------

  const getStockInfo = (medicineId) => {
    return inventoryByMedicineId[medicineId] || {
      currentStock: 0,
      expiredQuantity: 0,
      stockStatus: "out_of_stock",
      inventoryValue: 0,
      retailValue: 0,
      potentialProfit: 0,
      batches: []
    };
  };

  const getStockStatusClasses = (status) => {
    switch (status) {
      case "in_stock":
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";

      case "low_stock":
        return "border-amber-500/25 bg-amber-500/10 text-amber-400";

      case "out_of_stock":
        return "border-rose-500/25 bg-rose-500/10 text-rose-400";

      default:
        return "border-[#3A3A49] bg-[#292936] text-neutral-300";
    }
  };

  const getStockStatusLabel = (status) => {
    switch (status) {
      case "in_stock":
        return "In Stock";

      case "low_stock":
        return "Low Stock";

      case "out_of_stock":
        return "Out of Stock";

      default:
        return "Unknown";
    }
  };

  const formatCurrency = (value) =>
    `GH₵ ${Number(value || 0).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  // ------------------------------------------------------
  // Loading State
  // ------------------------------------------------------

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#171721] px-4 text-white">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#343441] bg-[#22222E] p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-violet-500/25 bg-[#292936]">
            <Loader2
              size={28}
              className="animate-spin text-violet-400"
            />
          </div>

          <p className="text-sm font-medium tracking-wide text-neutral-200">
            Loading medicines...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // Main Render
  // ======================================================

  return (
    <div className="dark relative min-h-screen min-w-0 overflow-x-clip bg-[#171721] text-white">
      {/* Ambient Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.06] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.04] blur-[120px]" />
      </div>

      <div className="min-w-0 space-y-5 bg-[#171721] pb-10 sm:space-y-8 sm:pb-12">
        {/* Page Header */}
        <section
          className={`${cardClasses} relative min-w-0 overflow-hidden p-4 sm:p-8`}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-500/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-fuchsia-500/[0.04] blur-3xl" />

          <div className="relative flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-500/25 bg-[#292936] px-3 py-1 text-xs font-semibold text-violet-300">
                <Sparkles size={13} />
                <span>Next-Gen Pharmacy Hub</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                Medicines{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                  &amp; Catalog
                </span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-300">
                Monitor inventory, manage pharmaceutical products, and
                maintain medicine and prescription information.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() =>
                  Promise.all([
                    fetchMedicines(true),
                    fetchCategories(),
                    fetchInventory()
                  ])
                }
                disabled={refreshing}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:border-[#555568] hover:bg-[#353544] hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing ? "animate-spin text-violet-400" : ""
                  }
                />
                <span>{refreshing ? "Syncing..." : "Sync Data"}</span>
              </button>

              <button
                type="button"
                onClick={openAddForm}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-400 hover:bg-violet-600/25 active:scale-[0.98]"
              >
                <Plus size={18} className="text-violet-300" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-[#29212B] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="break-words text-sm font-medium text-rose-200">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchMedicines()}
              className="min-h-10 shrink-0 rounded-xl border border-rose-500/30 bg-[#33252F] px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-[#44303B]"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
          {[
            {
              label: "Total Medicines",
              value: medicines.length,
              icon: Pill,
              accent: "violet"
            },
            {
              label: "Prescription Only",
              value: prescriptionCount,
              icon: Filter,
              accent: "amber"
            },
            {
              label: "Low Stock Alert",
              value: lowStockCount,
              icon: AlertTriangle,
              accent: "orange"
            },
            {
              label: "Out of Stock",
              value: outOfStockCount,
              icon: Package,
              accent: "rose"
            },
            {
              label: "Categories",
              value: categories.length,
              icon: Layers,
              accent: "emerald"
            }
          ].map((kpi) => {
            const accents = {
              violet:
                "bg-violet-500/10 text-violet-300 ring-violet-500/25",
              amber:
                "bg-amber-500/10 text-amber-300 ring-amber-500/25",
              orange:
                "bg-orange-500/10 text-orange-300 ring-orange-500/25",
              rose:
                "bg-rose-500/10 text-rose-300 ring-rose-500/25",
              emerald:
                "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
            };

            return (
              <div
                key={kpi.label}
                className={`${cardClasses} min-w-0 p-3 transition hover:border-[#555568] sm:p-5`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-[10px] font-semibold uppercase tracking-wider text-neutral-400 sm:text-xs">
                      {kpi.label}
                    </p>

                    <p className="mt-2 text-2xl font-black tracking-tight text-white sm:mt-3 sm:text-3xl">
                      {kpi.value}
                    </p>
                  </div>

                  <IconBox size="sm" className={accents[kpi.accent]}>
                    <kpi.icon size={19} />
                  </IconBox>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
        <section className={`${cardClasses} min-w-0 p-3 sm:p-5`}>
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_16rem_14rem]">
            <div className="relative min-w-0">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search medicine, brand, SKU or barcode..."
                className={`${inputClasses} pl-11`}
              />
            </div>

            <div className="relative min-w-0">
              <Filter
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
                className={`${selectClasses} appearance-none pl-11 pr-8`}
              >
                <option value="all">All Categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-0">
              <Package
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <select
                value={selectedStockStatus}
                onChange={(event) =>
                  setSelectedStockStatus(event.target.value)
                }
                className={`${selectClasses} appearance-none pl-11 pr-8`}
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </section>

        {/* Medicine Catalog */}
        <section className={`${cardClasses} min-w-0 overflow-hidden`}>
          <div className="flex flex-col justify-between gap-3 border-b border-[#373744] px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-wide text-white sm:text-lg">
                Medicine Catalog Directory
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                Showing{" "}
                <span className="font-semibold text-white">
                  {filteredMedicines.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-white">
                  {medicines.length}
                </span>{" "}
                recorded items
              </p>
            </div>

            <span className="w-fit rounded-lg border border-[#3A3A49] bg-[#292936] px-3 py-1.5 text-xs font-medium text-neutral-200">
              {filteredMedicines.length} results
            </span>
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3A3A49] bg-[#292936]">
                <Pill size={28} className="text-neutral-400" />
              </div>

              <h3 className="text-base font-bold text-white">
                No medicines found
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-relaxed text-neutral-300">
                Try adjusting your search terms or filters, or register a new
                medicine in the catalog.
              </p>

              {medicines.length === 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 flex min-h-10 items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-violet-400 hover:bg-violet-600/25"
                >
                  <Plus size={16} className="text-violet-300" />
                  Add First Medicine
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Medicine Cards */}
              <div className="grid min-w-0 gap-3 bg-[#22222E] p-3 sm:p-4 md:hidden">
                {filteredMedicines.map((medicine) => {
                  const stock = getStockInfo(medicine.id);

                  const matchedCat = categories.find(
                    (category) =>
                      String(category.id) === String(medicine.categoryId)
                  );

                  return (
                    <article
                      key={medicine.id}
                      className="min-w-0 rounded-2xl border border-[#3A3A49] bg-[#292936] p-3 shadow-sm transition hover:border-[#555568]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <MedicineImage
                          src={medicine.imageUrl}
                          alt={medicine.name}
                        />

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-bold text-white">
                            {medicine.name}
                          </h3>

                          <p className="mt-1 break-words text-xs text-neutral-300">
                            {medicine.genericName ||
                              medicine.brandName ||
                              "Standard Formulation"}
                          </p>

                          {medicine.brandName && medicine.genericName && (
                            <p className="mt-1 break-words text-xs text-neutral-400">
                              Brand: {medicine.brandName}
                            </p>
                          )}

                          <p className="mt-1 break-words text-xs text-neutral-400">
                            {matchedCat?.name || "Uncategorized"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#41414F] pt-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Dosage / Strength
                          </p>

                          <p className="mt-1 break-words text-xs font-medium text-white">
                            {medicine.dosageForm || "—"}
                            {medicine.strength
                              ? ` · ${medicine.strength}`
                              : ""}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            SKU
                          </p>

                          <p className="mt-1 break-all font-mono text-xs text-white">
                            {medicine.sku || "—"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Current Stock
                          </p>

                          <span
                            className={`mt-1 inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStockStatusClasses(stock.stockStatus)}`}
                          >
                            <span>{stock.currentStock} units</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {getStockStatusLabel(stock.stockStatus)}
                            </span>
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
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

                      {/* Mobile Actions */}
                      <div className="mt-4 border-t border-[#41414F] pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Medicine Actions
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(medicine)}
                            className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-[#3A3A49] bg-[#343442] px-1 py-2 text-xs font-semibold text-white transition hover:border-[#555568] hover:bg-[#414151]"
                            aria-label={`View ${medicine.name}`}
                          >
                            <Eye size={15} className="shrink-0" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditForm(medicine)}
                            className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-violet-500/40 bg-violet-500/10 px-1 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
                            aria-label={`Edit ${medicine.name}`}
                          >
                            <Edit3 size={15} className="shrink-0" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(medicine)}
                            disabled={deletingId === medicine.id}
                            className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-1 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Deactivate ${medicine.name}`}
                          >
                            {deletingId === medicine.id ? (
                              <Loader2
                                size={15}
                                className="shrink-0 animate-spin"
                              />
                            ) : (
                              <Trash2 size={15} className="shrink-0" />
                            )}

                            <span>
                              {deletingId === medicine.id ? "Wait" : "Delete"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-x-auto bg-[#22222E] md:block">
                <table className="w-full min-w-[1000px] bg-[#22222E]">
                  <thead>
                    <tr className="border-b border-[#373744] bg-[#292936] text-left">
                      {[
                        "Medicine Details",
                        "Category",
                        "Dosage & Strength",
                        "SKU",
                        "Stock Status",
                        "Prescription",
                        "Actions"
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-300 ${
                            heading === "Actions"
                              ? "sticky right-0 z-10 bg-[#292936] text-right"
                              : ""
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#373744] bg-[#22222E]">
                    {filteredMedicines.map((medicine) => {
                      const stock = getStockInfo(medicine.id);

                      const matchedCat = categories.find(
                        (category) =>
                          String(category.id) === String(medicine.categoryId)
                      );

                      return (
                        <tr
                          key={medicine.id}
                          className="group bg-[#22222E] transition-colors hover:bg-[#2D2D3A]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <MedicineImage
                                src={medicine.imageUrl}
                                alt={medicine.name}
                              />

                              <div className="min-w-0">
                                <p className="font-bold text-white">
                                  {medicine.name}
                                </p>

                                <p className="mt-1 text-xs text-neutral-300">
                                  {medicine.genericName ||
                                    medicine.brandName ||
                                    "Standard Formulation"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-lg border border-[#3A3A49] bg-[#292936] px-3 py-1 text-xs font-medium text-neutral-200">
                              {matchedCat?.name || "Uncategorized"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-white">
                              {medicine.dosageForm || "—"}
                            </p>

                            <p className="mt-1 text-xs text-neutral-300">
                              {medicine.strength || "N/A"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <p className="font-mono text-xs font-medium text-white">
                              {medicine.sku || "—"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStockStatusClasses(stock.stockStatus)}`}
                            >
                              {stock.currentStock} units
                            </span>

                            <p className="mt-1 text-[11px] text-neutral-300">
                              {getStockStatusLabel(stock.stockStatus)}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            {medicine.isPrescriptionRequired ? (
                              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                                Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                OTC
                              </span>
                            )}
                          </td>

                          <td className="sticky right-0 z-10 bg-[#22222E] px-6 py-4 group-hover:bg-[#2D2D3A]">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetails(medicine)}
                                className={regularButtonClasses}
                                title="View details"
                                aria-label={`View ${medicine.name}`}
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditForm(medicine)}
                                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 p-2 text-violet-200 transition hover:bg-violet-500/20"
                                title="Edit medicine"
                                aria-label={`Edit ${medicine.name}`}
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeactivate(medicine)}
                                disabled={deletingId === medicine.id}
                                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                                title="Deactivate medicine"
                                aria-label={`Deactivate ${medicine.name}`}
                              >
                                {deletingId === medicine.id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
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
          <div className="dark fixed inset-0 z-[9999] flex w-screen items-start justify-center overflow-x-hidden overflow-y-auto bg-black/75 p-3 text-white backdrop-blur-sm sm:p-6">
            <button
              type="button"
              aria-label="Close medicine form"
              className="absolute inset-0 h-full w-full cursor-default"
              onClick={closeForm}
              disabled={saving}
            />

            <div className={`${modalClasses} z-10 sm:max-w-4xl`}>
              <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              <div className={modalHeaderClasses}>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
                      {editingMedicine ? <Edit3 size={17} /> : <Plus size={18} />}
                    </div>

                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                      Medicine Management
                    </span>
                  </div>

                  <h2 className="break-words text-lg font-black text-white sm:text-2xl">
                    {editingMedicine ? "Edit Medicine Profile" : "Register New Medicine"}
                  </h2>

                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-300 sm:text-sm">
                    Configure medicine details, category, product specifications,
                    and inventory reorder settings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className={closeButtonClasses}
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#20202B]"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#20202B] px-4 py-5 sm:px-6 sm:py-6">
                  {formError && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-[#33252F] p-4 text-sm text-rose-200">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      <p className="break-words font-medium">{formError}</p>
                    </div>
                  )}

                  <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
                    {/* Medicine Name */}
                    <div className="relative min-w-0 sm:col-span-2">
                      <label className={labelClasses}>Medicine Name *</label>

                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={(event) => {
                          handleChange(event);
                          setShowMedicineSuggestions(true);
                        }}
                        onFocus={() => setShowMedicineSuggestions(true)}
                        placeholder="e.g. Paracetamol, Amoxicillin..."
                        required
                        className={inputClasses}
                      />

                      {showMedicineSuggestions &&
                        medicineSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[#3A3A49] bg-[#292936] shadow-2xl shadow-black/30">
                            <div className="border-b border-[#41414F] bg-[#343442] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                              Suggested Matches
                            </div>

                            <div className="max-h-60 divide-y divide-[#41414F] overflow-y-auto bg-[#292936]">
                              {medicineSuggestions.map((suggestion, idx) => (
                                <button
                                  key={`${suggestion.name}-${idx}`}
                                  type="button"
                                  onClick={() =>
                                    selectMedicineSuggestion(suggestion)
                                  }
                                  className="flex w-full min-w-0 items-center justify-between gap-3 bg-[#292936] px-4 py-3 text-left transition hover:bg-[#383847]"
                                >
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-bold text-white">
                                      {suggestion.name}
                                    </p>

                                    <p className="mt-1 break-words text-xs text-neutral-300">
                                      {suggestion.dosageForm} {suggestion.strength}
                                      {suggestion.brandName &&
                                        ` • ${suggestion.brandName}`}
                                    </p>
                                  </div>

                                  <span className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-200">
                                    {suggestion.source}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Generic Name</label>

                      <input
                        type="text"
                        name="genericName"
                        value={form.genericName}
                        onChange={handleChange}
                        placeholder="e.g. Acetaminophen"
                        className={inputClasses}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Brand Name</label>

                      <input
                        type="text"
                        name="brandName"
                        value={form.brandName}
                        onChange={handleChange}
                        placeholder="e.g. Panadol"
                        className={inputClasses}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Category *</label>

                      <select
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        required
                        className={selectClasses}
                      >
                        <option value="">Select Category...</option>

                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Dosage Form *</label>

                      <input
                        type="text"
                        name="dosageForm"
                        value={form.dosageForm}
                        onChange={handleChange}
                        placeholder="e.g. Tablet, Capsule, Syrup"
                        required
                        className={inputClasses}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Strength</label>

                      <input
                        type="text"
                        name="strength"
                        value={form.strength}
                        onChange={handleChange}
                        placeholder="e.g. 500mg, 10ml"
                        className={inputClasses}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>SKU Identifier</label>

                      <div className="relative">
                        <input
                          type="text"
                          name="sku"
                          value={form.sku}
                          readOnly
                          placeholder={
                            editingMedicine
                              ? "Existing SKU"
                              : "Assigned automatically when saved"
                          }
                          aria-describedby="sku-help"
                          className="w-full min-w-0 cursor-not-allowed rounded-xl border border-[#3A3A49] bg-[#292936] px-4 py-3 pr-12 font-mono text-sm text-white outline-none placeholder:text-neutral-400"
                        />

                        <span className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Sparkles size={16} className="text-violet-300" />
                        </span>
                      </div>

                      <p
                        id="sku-help"
                        className="mt-2 text-xs leading-relaxed text-neutral-300"
                      >
                        {editingMedicine
                          ? "This medicine's existing SKU is preserved."
                          : "PharmaCore assigns a unique SKU automatically when you save this medicine."}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>Barcode</label>

                      <input
                        type="text"
                        name="barcode"
                        value={form.barcode}
                        onChange={handleChange}
                        placeholder="e.g. 10928392019"
                        className={`${inputClasses} font-mono`}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className={labelClasses}>
                        Reorder Threshold Level *
                      </label>

                      <input
                        type="number"
                        name="reorderLevel"
                        value={form.reorderLevel}
                        onChange={handleChange}
                        min="0"
                        required
                        className={inputClasses}
                      />

                      <p className="mt-1.5 text-xs text-neutral-300">
                        Alert when stock reaches this level.
                      </p>
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                      <label className={labelClasses}>Image URL</label>

                      <input
                        type="url"
                        name="imageUrl"
                        value={form.imageUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/medicine.png"
                        className={`${inputClasses} font-mono`}
                      />

                      <p className="mt-2 text-xs leading-relaxed text-neutral-300">
                        Paste a direct image link to display a medicine thumbnail
                        in the catalog.
                      </p>

                      {form.imageUrl && (
                        <div className={`${innerPanelClasses} mt-3 p-3`}>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                            Image Preview
                          </p>

                          <img
                            src={form.imageUrl}
                            alt="Medicine preview"
                            className="h-32 w-full rounded-lg bg-[#292936] object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            onLoad={(event) => {
                              event.currentTarget.style.display = "block";
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                      <label className={labelClasses}>
                        Description / Clinical Notes
                      </label>

                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Optional details, indications, or administration notes..."
                        className={`${inputClasses} resize-y`}
                      />
                    </div>

                    <div
                      className={`${innerPanelClasses} flex min-w-0 items-start gap-3 p-4 sm:col-span-2`}
                    >
                      <input
                        type="checkbox"
                        id="isPrescriptionRequired"
                        name="isPrescriptionRequired"
                        checked={form.isPrescriptionRequired}
                        onChange={handleChange}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[#555568] bg-[#292936] text-violet-600 focus:ring-2 focus:ring-violet-500/30"
                      />

                      <div className="min-w-0">
                        <label
                          htmlFor="isPrescriptionRequired"
                          className="cursor-pointer text-sm font-semibold text-white"
                        >
                          Prescription Required
                        </label>

                        <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                          Mark this medicine as requiring a prescription before
                          dispensing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={modalFooterClasses}>
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className={`${secondaryButtonClasses} w-full sm:w-auto`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-violet-400 hover:bg-violet-600/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {saving && (
                      <Loader2 size={16} className="animate-spin" />
                    )}

                    <span>
                      {saving
                        ? "Saving..."
                        : editingMedicine
                          ? "Save Changes"
                          : "Register Medicine"}
                    </span>
                  </button>
                </div>
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
          <div className="dark fixed inset-0 z-[9999] flex w-screen items-start justify-center overflow-x-hidden overflow-y-auto bg-black/75 p-3 text-white backdrop-blur-sm sm:p-6">
            <button
              type="button"
              aria-label="Close medicine details"
              className="absolute inset-0 h-full w-full cursor-default"
              onClick={closeDetails}
            />

            <div className={`${modalClasses} z-10 sm:max-w-2xl`}>
              <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              <div className={`${modalHeaderClasses} items-center`}>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    Medicine Record
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-white">
                    Medicine Details
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeDetails}
                  className={closeButtonClasses}
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#20202B] p-4 sm:p-6">
                <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                  <MedicineImage
                    src={selectedMedicine.imageUrl}
                    alt={selectedMedicine.name}
                    size="large"
                  />

                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-black text-white">
                      {selectedMedicine.name}
                    </h3>

                    <p className="mt-1 break-words text-sm font-medium text-violet-300">
                      {selectedMedicine.genericName || "Generic Formulation"}
                      {selectedMedicine.brandName &&
                        ` • ${selectedMedicine.brandName}`}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="max-w-full break-words rounded-lg border border-[#3A3A49] bg-[#292936] px-3 py-1 text-xs font-semibold text-neutral-200">
                        {selectedMedicine.dosageForm || "Form not specified"}{" "}
                        {selectedMedicine.strength || ""}
                      </span>

                      {selectedMedicine.isPrescriptionRequired ? (
                        <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                          Prescription Only
                        </span>
                      ) : (
                        <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Over-The-Counter
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2">
                  <div className={`${innerPanelClasses} min-w-0 p-4`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      SKU Identifier
                    </p>

                    <p className="mt-2 break-all font-mono text-sm font-bold text-white">
                      {selectedMedicine.sku || "N/A"}
                    </p>
                  </div>

                  <div className={`${innerPanelClasses} min-w-0 p-4`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Barcode
                    </p>

                    <p className="mt-2 break-all font-mono text-sm font-bold text-white">
                      {selectedMedicine.barcode || "N/A"}
                    </p>
                  </div>
                </div>

                {selectedMedicine.description && (
                  <div className={`${innerPanelClasses} mb-5 min-w-0 p-4`}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Clinical Notes &amp; Description
                    </p>

                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
                      {selectedMedicine.description}
                    </p>
                  </div>
                )}

                {(() => {
                  const stock = getStockInfo(selectedMedicine.id);

                  return (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        Live Inventory Metrics
                      </h3>

                      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                        <div className={`${innerPanelClasses} min-w-0 p-4`}>
                          <p className="text-xs text-neutral-300">
                            Current Stock
                          </p>

                          <p className="mt-2 break-words text-xl font-black text-white">
                            {stock.currentStock} units
                          </p>
                        </div>

                        <div className={`${innerPanelClasses} min-w-0 p-4`}>
                          <p className="text-xs text-neutral-300">
                            Inventory Valuation
                          </p>

                          <p className="mt-2 break-words text-base font-black text-white sm:text-lg">
                            {formatCurrency(stock.inventoryValue)}
                          </p>
                        </div>

                        <div className="min-w-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <p className="text-xs text-neutral-300">
                            Potential Profit
                          </p>

                          <p className="mt-2 break-words text-base font-black text-emerald-300 sm:text-lg">
                            {formatCurrency(stock.potentialProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-6 flex flex-col gap-2 border-t border-[#373744] pt-5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const medicine = selectedMedicine;
                      setShowDetails(false);
                      openEditForm(medicine);
                    }}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
                  >
                    <Edit3 size={16} />
                    Edit Medicine
                  </button>

                  <button
                    type="button"
                    onClick={closeDetails}
                    className={secondaryButtonClasses}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Medicines;
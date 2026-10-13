
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Loader2,
  Mail,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  UserRound,
  X,
  XCircle
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
// Helpers
// =====================================================

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getCustomerName = (customer) => {
  if (!customer) return "Unknown customer";

  const firstName = customer.firstName || "";
  const lastName = customer.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    customer.fullName ||
    customer.customerName ||
    customer.name ||
    "Unknown customer"
  );
};

const getCreatorName = (creator) => {
  if (!creator) return "Unknown";

  const name = `${creator.firstName || ""} ${
    creator.lastName || ""
  }`.trim();

  return name || "Unknown";
};

const getMedicineName = (medicine) =>
  medicine?.name || "Unknown medicine";

const getMedicineDescription = (medicine) =>
  [medicine?.genericName, medicine?.strength, medicine?.dosageForm]
    .filter(Boolean)
    .join(" • ");

const getStatusClasses = (status) => {
  switch (status) {
    case "active":
      return "border-sky-500/20 bg-sky-900 text-sky-300";
    case "partially_dispensed":
      return "border-amber-500/20 bg-amber-900 text-amber-300";
    case "dispensed":
      return "border-emerald-500/20 bg-emerald-900 text-emerald-300";
    case "cancelled":
      return "border-red-500/20 bg-red-900 text-red-300";
    default:
      return "border-zinc-800 bg-[#0b0b0d] text-zinc-400";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "Active";
    case "partially_dispensed":
      return "Partially Dispensed";
    case "dispensed":
      return "Dispensed";
    case "cancelled":
      return "Cancelled";
    default:
      return status || "Unknown";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "active":
      return Clock3;
    case "partially_dispensed":
      return Package;
    case "dispensed":
      return CheckCircle2;
    case "cancelled":
      return XCircle;
    default:
      return ClipboardList;
  }
};

const createEmptyForm = () => ({
  prescriptionNumber: "",
  prescriptionDate: new Date().toISOString().split("T")[0],
  doctorName: "",
  doctorLicenseNumber: "",
  diagnosis: "",
  notes: "",
  customerId: ""
});

const createEmptyItem = () => ({
  medicineId: "",
  dosage: "",
  frequency: "",
  duration: "",
  quantity: 1,
  instructions: ""
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

// =====================================================
// Icon Box
// =====================================================

const IconBox = ({ children, className = "", size = "md" }) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-11 w-11 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center border border-zinc-800 ${className}`}
    >
      {children}
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

const Prescriptions = () => {
  const { user } = useAuth();
  const isMounted = useRef(false);

  const [prescriptions, setPrescriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionToCancel, setPrescriptionToCancel] = useState(null);

  const [formData, setFormData] = useState(createEmptyForm);
  const [formItems, setFormItems] = useState([createEmptyItem()]);

  const canManagePrescriptions =
    user?.role === "admin" || user?.role === "pharmacist";

  // =====================================================
  // API Requests (stable)
  // =====================================================

  const fetchPrescriptions = useCallback(async (showLoader = true) => {
    try {
      if (showLoader && isMounted.current) setLoading(true);
      if (isMounted.current) setError("");

      const response = await api.get("/prescriptions");

      if (!isMounted.current) return;

      setPrescriptions(response.data?.prescriptions || response.data?.data || []);
    } catch (err) {
      console.error("Failed to load prescriptions:", err);

      if (!isMounted.current) return;

      setError(getErrorMessage(err, "Unable to load prescriptions."));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      if (isMounted.current) setLoadingCustomers(true);

      const response = await api.get("/customers");
      const data = response.data;

      let customerList = [];

      if (Array.isArray(data)) {
        customerList = data;
      } else if (Array.isArray(data?.customers)) {
        customerList = data.customers;
      } else if (Array.isArray(data?.data)) {
        customerList = data.data;
      } else if (Array.isArray(data?.data?.customers)) {
        customerList = data.data.customers;
      }

      if (!isMounted.current) return;

      setCustomers(customerList);
    } catch (err) {
      console.error("Failed to load customers:", err);

      if (!isMounted.current) return;

      setCustomers([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load customers. Please check the customers API."
        )
      );
    } finally {
      if (isMounted.current) setLoadingCustomers(false);
    }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      if (isMounted.current) setLoadingMedicines(true);

      const response = await api.get("/medicines");

      if (!isMounted.current) return;

      setMedicines(response.data?.medicines || []);
    } catch (err) {
      console.error("Failed to load medicines:", err);

      if (!isMounted.current) return;

      setError(getErrorMessage(err, "Unable to load medicines."));
    } finally {
      if (isMounted.current) setLoadingMedicines(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // defer initial load to keep UI responsive
    const raf = window.requestAnimationFrame(() => {
      void Promise.all([fetchPrescriptions(), fetchCustomers(), fetchMedicines()]);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      isMounted.current = false;
    };
  }, [fetchPrescriptions, fetchCustomers, fetchMedicines]);

  const handleRefresh = async () => {
    if (isMounted.current) setRefreshing(true);
    if (isMounted.current) setError("");

    try {
      await Promise.all([fetchPrescriptions(false), fetchCustomers(), fetchMedicines()]);
    } finally {
      if (isMounted.current) setRefreshing(false);
    }
  };

  // =====================================================
  // Search, Filtering and Statistics
  // =====================================================

  const stats = useMemo(() => {
    const counts = {
      total: prescriptions.length,
      active: 0,
      partiallyDispensed: 0,
      dispensed: 0,
      cancelled: 0
    };

    prescriptions.forEach((prescription) => {
      switch (prescription.status) {
        case "active":
          counts.active += 1;
          break;
        case "partially_dispensed":
          counts.partiallyDispensed += 1;
          break;
        case "dispensed":
          counts.dispensed += 1;
          break;
        case "cancelled":
          counts.cancelled += 1;
          break;
        default:
          break;
      }
    });

    return counts;
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return prescriptions.filter((prescription) => {
      const customerName = getCustomerName(
        prescription.customer
      ).toLowerCase();

      const number = (
        prescription.prescriptionNumber || ""
      ).toLowerCase();

      const doctor = (prescription.doctorName || "").toLowerCase();

      const diagnosis = (
        prescription.diagnosis || ""
      ).toLowerCase();

      const matchesSearch =
        !term ||
        number.includes(term) ||
        customerName.includes(term) ||
        doctor.includes(term) ||
        diagnosis.includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        prescription.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchTerm, statusFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleStatusCardClick = (status) => {
    setStatusFilter(status);
  };

  // =====================================================
  // Form Helpers
  // =====================================================

  const resetForm = () => {
    setFormData(createEmptyForm());
    setFormItems([createEmptyItem()]);
  };

  const closeCreateModal = () => {
    if (submitting) return;

    setShowCreateModal(false);
    resetForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "quantity"
                  ? value === ""
                    ? ""
                    : Math.max(1, Number(value) || 1)
                  : value
            }
          : item
      )
    );
  };

  const addItem = () => {
    setFormItems((previous) => [...previous, createEmptyItem()]);
  };

  const removeItem = (index) => {
    if (formItems.length <= 1) return;

    setFormItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // =====================================================
  // Create Prescription
  // =====================================================

  const handleCreatePrescription = async (event) => {
    event.preventDefault();

    if (isMounted.current) {
      setError("");
      setSuccessMessage("");
    }

    if (!formData.prescriptionNumber.trim()) {
      if (isMounted.current) setError("Prescription number is required.");
      return;
    }

    if (!formData.prescriptionDate) {
      if (isMounted.current) setError("Prescription date is required.");
      return;
    }

    if (!formData.customerId) {
      if (isMounted.current) setError("Please select a customer.");
      return;
    }

    if (!formData.doctorName.trim()) {
      if (isMounted.current) setError("Doctor name is required.");
      return;
    }

    if (formItems.length === 0) {
      if (isMounted.current) setError("Add at least one medicine.");
      return;
    }

    const invalidItem = formItems.find(
      (item) =>
        !item.medicineId ||
        !item.dosage.trim() ||
        !item.frequency.trim() ||
        !item.duration.trim() ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
    );

    if (invalidItem) {
      if (isMounted.current)
        setError(
          "Complete all required medicine fields and enter a valid quantity."
        );
      return;
    }

    const medicineIds = formItems.map((item) =>
      String(item.medicineId)
    );

    if (new Set(medicineIds).size !== medicineIds.length) {
      if (isMounted.current) setError("A medicine can only be added once to the prescription.");
      return;
    }

    try {
      if (isMounted.current) setSubmitting(true);

      const payload = {
        prescriptionNumber: formData.prescriptionNumber.trim(),
        prescriptionDate: formData.prescriptionDate,
        doctorName: formData.doctorName.trim(),
        doctorLicenseNumber:
          formData.doctorLicenseNumber.trim() || undefined,
        diagnosis: formData.diagnosis.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        customerId: Number(formData.customerId),
        items: formItems.map((item) => ({
          medicineId: Number(item.medicineId),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          quantity: Number(item.quantity),
          instructions: item.instructions.trim() || undefined
        }))
      };

      const response = await api.post("/prescriptions", payload);

      if (!isMounted.current) return;

      setSuccessMessage(
        response.data?.message || "Prescription created successfully."
      );

      setShowCreateModal(false);
      resetForm();

      await fetchPrescriptions(false);
    } catch (err) {
      console.error("Create prescription error:", err);

      if (!isMounted.current) return;

      setError(getErrorMessage(err, "Unable to create prescription."));
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  // =====================================================
  // Prescription Details
  // =====================================================

  const handleViewPrescription = async (prescription) => {
    if (isMounted.current) {
      setSelectedPrescription(prescription);
      setShowDetailsModal(true);
      setLoadingDetails(true);
      setError("");
    }

    try {
      const response = await api.get(
        `/prescriptions/${prescription.id}`
      );

      if (!isMounted.current) return;

      setSelectedPrescription(
        response.data?.prescription || prescription
      );
    } catch (err) {
      console.error("Failed to load prescription details:", err);

      if (!isMounted.current) return;

      setError(getErrorMessage(err, "Unable to load prescription details."));
    } finally {
      if (isMounted.current) setLoadingDetails(false);
    }
  };

  // =====================================================
  // Cancellation
  // =====================================================

  const canCancelPrescription = (prescription) =>
    Boolean(prescription && prescription.status === "active");

  const openCancelModal = (prescription) => {
    setPrescriptionToCancel(prescription);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (submitting) return;

    setShowCancelModal(false);
    setPrescriptionToCancel(null);
  };

  const handleCancelPrescription = async () => {
    if (!prescriptionToCancel) return;

    try {
      if (isMounted.current) {
        setSubmitting(true);
        setError("");
        setSuccessMessage("");
      }

      const response = await api.delete(
        `/prescriptions/${prescriptionToCancel.id}`
      );

      if (!isMounted.current) return;

      setSuccessMessage(
        response.data?.message || "Prescription cancelled successfully."
      );

      const cancelledPrescription = response.data?.prescription;

      setShowCancelModal(false);
      setPrescriptionToCancel(null);

      if (
        selectedPrescription?.id === prescriptionToCancel.id &&
        cancelledPrescription
      ) {
        setSelectedPrescription(cancelledPrescription);
      }

      await fetchPrescriptions(false);
    } catch (err) {
      console.error("Cancel prescription error:", err);

      if (!isMounted.current) return;

      setError(getErrorMessage(err, "Unable to cancel prescription."));
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="relative min-h-full bg-[#08080a] text-zinc-100">
      <div className="relative mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#0f0f11] border border-zinc-800">
                <ClipboardList size={13} />
              </span>
              <span>Pharmacy Management</span>
              <ChevronRight size={14} className="text-zinc-600" />
              <span className="text-zinc-300">Prescriptions</span>
            </div>

            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Prescriptions
              <Sparkles size={20} className="text-violet-400/70" />
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Create, monitor and manage patient prescriptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            {canManagePrescriptions && (
              <button
                type="button"
                onClick={() => {
                  if (isMounted.current) {
                    setError("");
                    setSuccessMessage("");
                    setShowCreateModal(true);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={18} />
                <span>New Prescription</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-700 bg-[#052014] px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">{successMessage}</div>
            <button
              type="button"
              aria-label="Dismiss success message"
              onClick={() => isMounted.current && setSuccessMessage("")}
              className="rounded-lg p-1 text-emerald-300/60"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-700 bg-[#2b0a0a] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              aria-label="Dismiss error message"
              onClick={() => isMounted.current && setError("")}
              className="rounded-lg p-1 text-red-300/60"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total"
            value={stats.total}
            icon={ClipboardList}
            description="All prescriptions"
            accent="violet"
            active={statusFilter === "all"}
            onClick={() => handleStatusCardClick("all")}
          />

          <StatCard
            label="Active"
            value={stats.active}
            icon={Clock3}
            description="Awaiting dispensing"
            accent="sky"
            active={statusFilter === "active"}
            onClick={() => handleStatusCardClick("active")}
          />

          <StatCard
            label="Partially Dispensed"
            value={stats.partiallyDispensed}
            icon={Package}
            description="Dispensing in progress"
            accent="amber"
            active={statusFilter === "partially_dispensed"}
            onClick={() => handleStatusCardClick("partially_dispensed")}
          />

          <StatCard
            label="Dispensed"
            value={stats.dispensed}
            icon={CheckCircle2}
            description="Fully dispensed"
            accent="emerald"
            active={statusFilter === "dispensed"}
            onClick={() => handleStatusCardClick("dispensed")}
          />

          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            description="Cancelled prescriptions"
            accent="rose"
            active={statusFilter === "cancelled"}
            onClick={() => handleStatusCardClick("cancelled")}
          />
        </div>

        {/* Search and filters */}
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search prescription number, customer, doctor or diagnosis..."
                aria-label="Search prescriptions"
                className="w-full rounded-xl border border-zinc-800 bg-[#0b0b0d] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500"
              />
            </div>

            <div className="relative w-full lg:w-56">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by prescription status"
                className="w-full cursor-pointer rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 pr-10 text-sm text-zinc-200"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="partially_dispensed">Partially Dispensed</option>
                <option value="dispensed">Dispensed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300"
              >
                <X size={15} />
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
            <span>
              Showing{" "}
              <span className="font-semibold text-zinc-300">
                {filteredPrescriptions.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-zinc-300">
                {prescriptions.length}
              </span>{" "}
              prescriptions
            </span>

            {statusFilter !== "all" && (
              <span className="rounded-full border border-violet-600 bg-[#111113] px-2.5 py-1 text-violet-300">
                Status: {getStatusLabel(statusFilter)}
              </span>
            )}
          </div>
        </div>

        {/* Prescriptions list */}
        <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0d]">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <Loader2 size={30} className="text-violet-400" />
                <span className="text-sm">Loading prescriptions...</span>
              </div>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              canCreate={canManagePrescriptions}
              onCreate={() => {
                if (isMounted.current) {
                  setError("");
                  setSuccessMessage("");
                  setShowCreateModal(true);
                }
              }}
              onClear={clearFilters}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">Prescription</th>
                      <th className="px-5 py-4 font-medium">Customer</th>
                      <th className="px-5 py-4 font-medium">Doctor</th>
                      <th className="px-5 py-4 font-medium">Date</th>
                      <th className="px-5 py-4 font-medium">Medicines</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPrescriptions.map((prescription) => {
                      const StatusIcon = getStatusIcon(prescription.status);

                      return (
                        <tr key={prescription.id} className="group">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {prescription.prescriptionNumber}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              ID #{prescription.id}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <IconBox size="sm" className="text-violet-300">
                                <UserRound size={17} />
                              </IconBox>

                              <div>
                                <div className="font-medium text-zinc-200">
                                  {getCustomerName(prescription.customer)}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {prescription.customer?.phone || "No phone"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-zinc-300">
                              {prescription.doctorName || "—"}
                            </div>

                            {prescription.doctorLicenseNumber && (
                              <div className="mt-1 text-xs text-zinc-500">
                                License: {prescription.doctorLicenseNumber}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                              <CalendarDays size={15} className="text-zinc-500" />
                              {formatDate(prescription.prescriptionDate)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                              <Package size={15} className="text-zinc-500" />
                              {prescription.items?.length || 0}{" "}
                              {(prescription.items?.length || 0) === 1 ? "medicine" : "medicines"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={prescription.status} StatusIcon={StatusIcon} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewPrescription(prescription)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0b0b0d] px-3 py-2 text-xs font-medium text-zinc-300"
                              >
                                View
                                <ChevronRight size={14} />
                              </button>

                              {canManagePrescriptions && canCancelPrescription(prescription) && (
                                <button
                                  type="button"
                                  onClick={() => openCancelModal(prescription)}
                                  className="rounded-lg border border-red-700 bg-[#2b0a0a] p-2 text-red-300"
                                  title="Cancel prescription"
                                  aria-label={`Cancel ${prescription.prescriptionNumber}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-zinc-800 lg:hidden">
                {filteredPrescriptions.map((prescription) => {
                  const StatusIcon = getStatusIcon(prescription.status);

                  return (
                    <div key={prescription.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{prescription.prescriptionNumber}</div>
                          <div className="mt-1 text-xs text-zinc-500">{formatDate(prescription.prescriptionDate)}</div>
                        </div>

                        <StatusBadge status={prescription.status} StatusIcon={StatusIcon} />
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <UserRound size={16} className="text-zinc-500" />
                          <div>
                            <div className="text-sm font-medium text-zinc-200">{getCustomerName(prescription.customer)}</div>
                            <div className="text-xs text-zinc-500">Patient</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Stethoscope size={16} className="text-zinc-500" />
                          <div>
                            <div className="text-sm text-zinc-300">{prescription.doctorName || "—"}</div>
                            <div className="text-xs text-zinc-500">Prescribing doctor</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Package size={16} className="text-zinc-500" />
                          <div className="text-sm text-zinc-300">{prescription.items?.length || 0} medicines</div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewPrescription(prescription)}
                          className="flex-1 rounded-lg border border-zinc-800 bg-[#0b0b0d] px-3 py-2 text-sm font-medium text-zinc-300"
                        >
                          View Details
                        </button>

                        {canManagePrescriptions && canCancelPrescription(prescription) && (
                          <button type="button" onClick={() => openCancelModal(prescription)} aria-label={`Cancel ${prescription.prescriptionNumber}`} className="rounded-lg border border-red-700 px-3 py-2 text-red-300">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          CREATE MODAL
      ====================================================== */}

      {showCreateModal && (
        <ModalOverlay onClose={closeCreateModal}>
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] sm:max-h-[90vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Sparkles size={17} className="text-violet-400" />
                  New Prescription
                </h2>
                <p className="mt-1 text-xs text-zinc-400">Create a prescription for a registered customer.</p>
              </div>

              <button type="button" onClick={closeCreateModal} disabled={submitting} aria-label="Close create prescription form" className="rounded-lg p-2 text-zinc-400">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="space-y-6">
                  <section>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-violet-400" />
                      <FileText size={17} className="text-violet-400" />
                      <h3 className="font-semibold text-white">Prescription Information</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Prescription Number" required>
                        <input type="text" name="prescriptionNumber" value={formData.prescriptionNumber} onChange={handleFormChange} placeholder="e.g. RX-2026-001" className={inputClass} required />
                      </FormField>

                      <FormField label="Prescription Date" required>
                        <input type="date" name="prescriptionDate" value={formData.prescriptionDate} onChange={handleFormChange} className={inputClass} required />
                      </FormField>

                      <FormField label="Customer" required>
                        <select name="customerId" value={formData.customerId} onChange={handleFormChange} className={inputClass} disabled={loadingCustomers || customers.length === 0} required>
                          <option value="">{loadingCustomers ? "Loading customers..." : customers.length === 0 ? "No customers found — add a customer first" : "Select a customer"}</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {getCustomerName(customer)}
                              {customer.phone ? ` — ${customer.phone}` : ""}
                            </option>
                          ))}
                        </select>

                        {!loadingCustomers && customers.length === 0 && (
                          <p className="mt-2 text-xs text-amber-400">
                            No customers are available. Check the Customers page and confirm that the customers API returns their records.
                          </p>
                        )}
                      </FormField>

                      <FormField label="Doctor Name" required>
                        <input type="text" name="doctorName" value={formData.doctorName} onChange={handleFormChange} placeholder="e.g. Dr. Kwame Mensah" className={inputClass} required />
                      </FormField>

                      <FormField label="Doctor License Number">
                        <input type="text" name="doctorLicenseNumber" value={formData.doctorLicenseNumber} onChange={handleFormChange} placeholder="e.g. MED-GH-12345" className={inputClass} />
                      </FormField>

                      <FormField label="Diagnosis">
                        <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleFormChange} placeholder="e.g. Bacterial infection" className={inputClass} />
                      </FormField>
                    </div>

                    <div className="mt-4">
                      <FormField label="Notes">
                        <textarea name="notes" value={formData.notes} onChange={handleFormChange} rows={3} placeholder="Additional prescription notes..." className={`${inputClass} resize-none`} />
                      </FormField>
                    </div>
                  </section>

                  <section>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-violet-400" />
                        <Package size={17} className="text-violet-400" />
                        <div>
                          <h3 className="font-semibold text-white">Prescribed Medicines</h3>
                          <p className="mt-0.5 text-xs text-zinc-400">Add each medicine and its dosage instructions.</p>
                        </div>
                      </div>

                      <button type="button" onClick={addItem} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300">
                        <Plus size={15} />
                        Add Medicine
                      </button>
                    </div>

                    <div className="space-y-4">
                      {formItems.map((item, index) => (
                        <div key={index} className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Medicine {index + 1}</span>

                            {formItems.length > 1 && (
                              <button type="button" onClick={() => removeItem(index)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-red-400">
                                <Trash2 size={14} />
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="md:col-span-2 lg:col-span-3">
                              <FormField label="Medicine" required>
                                <select value={item.medicineId} onChange={(event) => handleItemChange(index, "medicineId", event.target.value)} className={inputClass} disabled={loadingMedicines} required>
                                  <option value="">{loadingMedicines ? "Loading medicines..." : "Select medicine"}</option>
                                  {medicines.filter((medicine) => medicine.isActive !== false).map((medicine) => (
                                    <option key={medicine.id} value={medicine.id}>
                                      {medicine.name}
                                      {medicine.strength ? ` — ${medicine.strength}` : ""}
                                      {medicine.dosageForm ? ` (${medicine.dosageForm})` : ""}
                                    </option>
                                  ))}
                                </select>
                              </FormField>
                            </div>

                            <FormField label="Dosage" required>
                              <input type="text" value={item.dosage} onChange={(event) => handleItemChange(index, "dosage", event.target.value)} placeholder="e.g. 500mg" className={inputClass} required />
                            </FormField>

                            <FormField label="Frequency" required>
                              <input type="text" value={item.frequency} onChange={(event) => handleItemChange(index, "frequency", event.target.value)} placeholder="e.g. 3 times daily" className={inputClass} required />
                            </FormField>

                            <FormField label="Duration" required>
                              <input type="text" value={item.duration} onChange={(event) => handleItemChange(index, "duration", event.target.value)} placeholder="e.g. 7 days" className={inputClass} required />
                            </FormField>

                            <FormField label="Quantity" required>
                              <div className="flex items-center overflow-hidden rounded-xl border border-zinc-800 bg-[#0b0b0d]">
                                <button type="button" aria-label="Decrease quantity" onClick={() => handleItemChange(index, "quantity", Math.max(1, Number(item.quantity || 1) - 1))} className="px-3 py-3 text-zinc-400">
                                  <Minus size={15} />
                                </button>

                                <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => handleItemChange(index, "quantity", event.target.value)} className="w-full bg-transparent px-2 py-2.5 text-center text-sm text-white outline-none" required />

                                <button type="button" aria-label="Increase quantity" onClick={() => handleItemChange(index, "quantity", Number(item.quantity || 1) + 1)} className="px-3 py-3 text-zinc-400">
                                  <Plus size={15} />
                                </button>
                              </div>
                            </FormField>

                            <div className="md:col-span-2 lg:col-span-2">
                              <FormField label="Instructions">
                                <input type="text" value={item.instructions} onChange={(event) => handleItemChange(index, "instructions", event.target.value)} placeholder="e.g. Take after meals." className={inputClass} />
                              </FormField>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex shrink-0 gap-3 border-t border-zinc-800 bg-[#0e0e11] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={closeCreateModal} disabled={submitting} className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 disabled:opacity-50">Cancel</button>

                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="text-white" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Create Prescription
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* =====================================================
          DETAILS MODAL
      ====================================================== */}

      {showDetailsModal && selectedPrescription && (
        <ModalOverlay onClose={() => setShowDetailsModal(false)}>
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] sm:max-h-[90vh]">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-white">{selectedPrescription.prescriptionNumber}</h2>

                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(selectedPrescription.status)}`}>
                    {getStatusLabel(selectedPrescription.status)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-zinc-500">Prescription ID #{selectedPrescription.id}</p>
              </div>

              <button type="button" onClick={() => setShowDetailsModal(false)} aria-label="Close prescription details" className="rounded-lg p-2 text-zinc-400">
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {loadingDetails ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <Loader2 size={28} className="text-violet-400" />
                    <span className="text-sm">Loading prescription...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoPanel icon={UserRound} title="Patient">
                      <div className="font-semibold text-white">{getCustomerName(selectedPrescription.customer)}</div>

                      {selectedPrescription.customer?.phone && <div className="mt-2 text-sm text-zinc-400">{selectedPrescription.customer.phone}</div>}

                      {selectedPrescription.customer?.email && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                          <Mail size={14} />
                          <span className="break-all">{selectedPrescription.customer.email}</span>
                        </div>
                      )}
                    </InfoPanel>

                    <InfoPanel icon={Stethoscope} title="Prescriber">
                      <div className="font-semibold text-white">{selectedPrescription.doctorName || "—"}</div>

                      {selectedPrescription.doctorLicenseNumber && <div className="mt-2 text-sm text-zinc-400">License: {selectedPrescription.doctorLicenseNumber}</div>}
                    </InfoPanel>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailValue label="Prescription Date" value={formatDate(selectedPrescription.prescriptionDate)} />
                      <DetailValue label="Diagnosis" value={selectedPrescription.diagnosis || "—"} />
                      <DetailValue label="Created By" value={getCreatorName(selectedPrescription.creator)} />
                      <DetailValue label="Created" value={formatDateTime(selectedPrescription.createdAt)} />
                    </div>
                  </div>

                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-violet-400" />
                      <Package size={17} className="text-violet-400" />
                      <h3 className="font-semibold text-white">Prescribed Medicines</h3>
                    </div>

                    <div className="space-y-3">
                      {selectedPrescription.items?.length ? (
                        selectedPrescription.items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-semibold text-white">{getMedicineName(item.medicine)}</div>

                                <div className="mt-1 text-sm text-zinc-400">{getMedicineDescription(item.medicine)}</div>

                                {item.medicine?.sku && <div className="mt-1 text-xs text-zinc-500">SKU: {item.medicine.sku}</div>}
                              </div>

                              <div className="rounded-xl border border-violet-700 px-3 py-2 text-right">
                                <div className="text-xs text-zinc-400">Quantity prescribed</div>
                                <div className="text-lg font-bold text-violet-300">{item.quantity}</div>
                                <div className="text-xs text-zinc-400">Dispensed: {item.dispensedQuantity ?? 0}</div>
                                <div className="text-xs text-zinc-400">Remaining: {Math.max(0, Number(item.quantity || 0) - Number(item.dispensedQuantity || 0))}</div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <DetailValue label="Dosage" value={item.dosage || "—"} />
                              <DetailValue label="Frequency" value={item.frequency || "—"} />
                              <DetailValue label="Duration" value={item.duration || "—"} />
                            </div>

                            {item.instructions && (
                              <div className="mt-4 rounded-xl border border-zinc-800 bg-[#111113] p-3">
                                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Instructions</div>
                                <div className="mt-1 text-sm text-zinc-300">{item.instructions}</div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">No prescription items found.</div>
                      )}
                    </div>
                  </section>

                  {selectedPrescription.notes && (
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-violet-400" />
                        <FileText size={17} className="text-violet-400" />
                        <h3 className="font-semibold text-white">Notes</h3>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4 text-sm leading-6 text-zinc-300">{selectedPrescription.notes}</div>
                    </section>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-zinc-800 bg-[#0e0e11] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-xs text-zinc-400">
                {selectedPrescription.status === "active"
                  ? "This prescription is active."
                  : selectedPrescription.status === "partially_dispensed"
                    ? "Dispensing has started for this prescription."
                    : selectedPrescription.status === "dispensed"
                      ? "This prescription has been fully dispensed."
                      : selectedPrescription.status === "cancelled"
                        ? "This prescription has been cancelled."
                        : "Prescription status information."}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDetailsModal(false)} className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300">Close</button>

                {canManagePrescriptions && canCancelPrescription(selectedPrescription) && (
                  <button type="button" onClick={() => { setShowDetailsModal(false); openCancelModal(selectedPrescription); }} className="inline-flex items-center gap-2 rounded-xl border border-red-700 bg-[#2b0a0a] px-4 py-2.5 text-sm font-medium text-red-300">
                    <XCircle size={16} />
                    Cancel Prescription
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* =====================================================
          CANCEL MODAL
      ====================================================== */}

      {showCancelModal && prescriptionToCancel && (
        <ModalOverlay onClose={closeCancelModal}>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] p-6">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b0a0a] text-red-300">
              <AlertCircle size={24} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">Cancel Prescription?</h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              You are about to cancel prescription <span className="font-medium text-zinc-200">{prescriptionToCancel.prescriptionNumber}</span> for <span className="font-medium text-zinc-200">{getCustomerName(prescriptionToCancel.customer)}</span>.
            </p>

            <p className="mt-3 text-xs leading-5 text-zinc-500">This changes the prescription status rather than permanently deleting its record. Prescriptions that have started dispensing cannot be cancelled through this action.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeCancelModal} disabled={submitting} className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 disabled:opacity-50">Keep Prescription</button>

              <button type="button" onClick={handleCancelPrescription} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? (
                  <>
                    <Loader2 size={16} className="text-white" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Cancel Prescription
                  </>
                )}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};

// =====================================================
// Reusable UI Components
// =====================================================

const inputClass = "w-full rounded-xl border border-zinc-800 bg-[#0b0b0d] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600";

const FormField = ({ label, required = false, children }) => (
  <label className="block">
    <div className="mb-2 text-xs font-medium text-zinc-400">
      {label}
      {required && <span className="ml-1 text-red-400">*</span>}
    </div>
    {children}
  </label>
);

const StatCard = ({ label, value, icon: Icon, description, accent = "violet", active = false, onClick }) => {
  const accents = {
    violet: { bg: "bg-[#0e0e11]", iconBg: "bg-violet-900 text-violet-300" },
    sky: { bg: "bg-[#0e0e11]", iconBg: "bg-sky-900 text-sky-300" },
    amber: { bg: "bg-[#0e0e11]", iconBg: "bg-amber-900 text-amber-300" },
    emerald: { bg: "bg-[#0e0e11]", iconBg: "bg-emerald-900 text-emerald-300" },
    rose: { bg: "bg-[#0e0e11]", iconBg: "bg-red-900 text-rose-300" }
  };

  const style = accents[accent] || accents.violet;

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`w-full text-left rounded-xl border border-zinc-800 p-4 ${style.bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-white">{value}</div>
          <div className="mt-1 text-xs text-zinc-500">{description}</div>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconBg}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-3 text-xs text-zinc-400">{active ? "Currently selected" : "Click to filter"}</div>
    </button>
  );
};

const StatusBadge = ({ status, StatusIcon }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>
    <StatusIcon size={13} />
    {getStatusLabel(status)}
  </span>
);

const InfoPanel = ({ icon: Icon, title, children }) => (
  <div className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
      <Icon size={15} className="text-violet-400" />
      {title}
    </div>

    <div>{children}</div>
  </div>
);

const DetailValue = ({ label, value }) => (
  <div>
    <div className="text-xs uppercase tracking-wider text-zinc-600">{label}</div>
    <div className="mt-1 break-words text-sm text-zinc-300">{value}</div>
  </div>
);

const EmptyState = ({ hasFilters, onCreate, onClear, canCreate }) => (
  <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-800 bg-[#0f0f11] text-violet-300">
      <ClipboardList size={26} />
    </div>

    <h3 className="mt-5 text-base font-semibold text-white">{hasFilters ? "No matching prescriptions" : "No prescriptions yet"}</h3>

    <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
      {hasFilters ? "No prescriptions match the current search and status filters. Try changing your search or clearing the filters." : "Create the first prescription to start tracking patient medication orders."}
    </p>

    <div className="mt-5 flex flex-wrap justify-center gap-3">
      {hasFilters && (
        <button type="button" onClick={onClear} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300">
          <X size={16} />
          Clear filters
        </button>
      )}

      {!hasFilters && canCreate && (
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={17} />
          New Prescription
        </button>
      )}
    </div>
  </div>
);

// =====================================================
// Modal overlay (locks body scroll while open)
// =====================================================
const ModalOverlay = ({ children, onClose }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 p-2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[98%]">{children}</div>
    </div>
  );
};

export default Prescriptions;
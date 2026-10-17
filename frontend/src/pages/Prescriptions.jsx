
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
  [
    medicine?.genericName,
    medicine?.strength,
    medicine?.dosageForm
  ]
    .filter(Boolean)
    .join(" • ");

const getStatusClasses = (status) => {
  switch (status) {
    case "active":
      return "border-sky-500/30 bg-sky-950/70 text-sky-300";

    case "partially_dispensed":
      return "border-amber-500/30 bg-amber-950/70 text-amber-300";

    case "dispensed":
      return "border-emerald-500/30 bg-emerald-950/70 text-emerald-300";

    case "cancelled":
      return "border-red-500/30 bg-red-950/70 text-red-300";

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
// Shared Styles
// =====================================================

const inputClass =
  "w-full min-w-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60";

// =====================================================
// Icon Box
// =====================================================

const IconBox = ({
  children,
  className = "",
  size = "md"
}) => {
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

  const [selectedPrescription, setSelectedPrescription] =
    useState(null);

  const [prescriptionToCancel, setPrescriptionToCancel] =
    useState(null);

  const [formData, setFormData] = useState(createEmptyForm);
  const [formItems, setFormItems] = useState([createEmptyItem()]);

  const canManagePrescriptions =
    user?.role === "admin" ||
    user?.role === "pharmacist";

  // =====================================================
  // API Requests
  // =====================================================

  const fetchPrescriptions = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader && isMounted.current) {
          setLoading(true);
        }

        if (isMounted.current) {
          setError("");
        }

        const response = await api.get("/prescriptions");

        if (!isMounted.current) return;

        const data = response.data;

        setPrescriptions(
          Array.isArray(data?.prescriptions)
            ? data.prescriptions
            : Array.isArray(data?.data)
              ? data.data
              : []
        );
      } catch (err) {
        console.error(
          "Failed to load prescriptions:",
          err
        );

        if (!isMounted.current) return;

        setError(
          getErrorMessage(
            err,
            "Unable to load prescriptions."
          )
        );
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const fetchCustomers = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoadingCustomers(true);
      }

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
      if (isMounted.current) {
        setLoadingCustomers(false);
      }
    }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoadingMedicines(true);
      }

      const response = await api.get("/medicines");

      if (!isMounted.current) return;

      const data = response.data;

      setMedicines(
        Array.isArray(data?.medicines)
          ? data.medicines
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []
      );
    } catch (err) {
      console.error("Failed to load medicines:", err);

      if (!isMounted.current) return;

      setMedicines([]);

      setError(
        getErrorMessage(
          err,
          "Unable to load medicines."
        )
      );
    } finally {
      if (isMounted.current) {
        setLoadingMedicines(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const animationFrame = window.requestAnimationFrame(() => {
      void Promise.all([
        fetchPrescriptions(),
        fetchCustomers(),
        fetchMedicines()
      ]);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      isMounted.current = false;
    };
  }, [
    fetchPrescriptions,
    fetchCustomers,
    fetchMedicines
  ]);

  // =====================================================
  // Refresh
  // =====================================================

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setError("");

    try {
      await Promise.all([
        fetchPrescriptions(false),
        fetchCustomers(),
        fetchMedicines()
      ]);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
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

      const doctor = (
        prescription.doctorName || ""
      ).toLowerCase();

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
  }, [
    prescriptions,
    searchTerm,
    statusFilter
  ]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all";

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
                    : Math.max(
                        1,
                        Number(value) || 1
                      )
                  : value
            }
          : item
      )
    );
  };

  const addItem = () => {
    setFormItems((previous) => [
      ...previous,
      createEmptyItem()
    ]);
  };

  const removeItem = (index) => {
    setFormItems((previous) => {
      if (previous.length <= 1) {
        return previous;
      }

      return previous.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  // =====================================================
  // Create Prescription
  // =====================================================

  const handleCreatePrescription = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!formData.prescriptionDate) {
      setError("Prescription date is required.");
      return;
    }

    if (!formData.customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!formData.doctorName.trim()) {
      setError("Doctor name is required.");
      return;
    }

    if (formItems.length === 0) {
      setError("Add at least one medicine.");
      return;
    }

    const invalidItem = formItems.find(
      (item) =>
        !item.medicineId ||
        !item.dosage.trim() ||
        !item.frequency.trim() ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
    );

    if (invalidItem) {
      setError(
        "Complete all required medicine fields and enter a valid quantity."
      );
      return;
    }

    const medicineIds = formItems.map((item) =>
      String(item.medicineId)
    );

    if (
      new Set(medicineIds).size !== medicineIds.length
    ) {
      setError(
        "A medicine can only be added once to the prescription."
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        prescriptionNumber:
          formData.prescriptionNumber.trim() || undefined,

        prescriptionDate:
          formData.prescriptionDate,

        doctorName:
          formData.doctorName.trim(),

        diagnosis:
          formData.diagnosis.trim() ||
          undefined,

        notes:
          formData.notes.trim() ||
          undefined,

        customerId:
          Number(formData.customerId),

        items: formItems.map((item) => ({
          medicineId: Number(item.medicineId),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim() || undefined,
          quantity: Number(item.quantity),
          instructions:
            item.instructions.trim() ||
            undefined
        }))
      };

      const response = await api.post(
        "/prescriptions",
        payload
      );

      if (!isMounted.current) return;

      setSuccessMessage(
        response.data?.message ||
          "Prescription created successfully."
      );

      setShowCreateModal(false);
      resetForm();

      await fetchPrescriptions(false);
    } catch (err) {
      console.error(
        "Create prescription error:",
        err
      );

      if (!isMounted.current) return;

      setError(
        getErrorMessage(
          err,
          "Unable to create prescription."
        )
      );
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  // =====================================================
  // Prescription Details
  // =====================================================

  const handleViewPrescription = async (prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setError("");

    try {
      const response = await api.get(
        `/prescriptions/${prescription.id}`
      );

      if (!isMounted.current) return;

      setSelectedPrescription(
        response.data?.prescription ||
          response.data?.data ||
          prescription
      );
    } catch (err) {
      console.error(
        "Failed to load prescription details:",
        err
      );

      if (!isMounted.current) return;

      setError(
        getErrorMessage(
          err,
          "Unable to load prescription details."
        )
      );
    } finally {
      if (isMounted.current) {
        setLoadingDetails(false);
      }
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
  };

  // =====================================================
  // Cancellation
  // =====================================================

  const canCancelPrescription = (prescription) =>
    Boolean(
      prescription &&
      prescription.status === "active"
    );

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
    if (!prescriptionToCancel || submitting) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await api.delete(
        `/prescriptions/${prescriptionToCancel.id}`
      );

      if (!isMounted.current) return;

      setSuccessMessage(
        response.data?.message ||
          "Prescription cancelled successfully."
      );

      const cancelledPrescription =
        response.data?.prescription;

      setShowCancelModal(false);
      setPrescriptionToCancel(null);

      if (
        selectedPrescription?.id ===
          prescriptionToCancel.id &&
        cancelledPrescription
      ) {
        setSelectedPrescription(cancelledPrescription);
      }

      await fetchPrescriptions(false);
    } catch (err) {
      console.error(
        "Cancel prescription error:",
        err
      );

      if (!isMounted.current) return;

      setError(
        getErrorMessage(
          err,
          "Unable to cancel prescription."
        )
      );
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="relative min-h-full w-full min-w-0 overflow-x-clip bg-[#08080a] text-zinc-100">
      <div className="relative mx-auto w-full min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 xl:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-8 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-violet-300">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-[#0f0f11]">
                <ClipboardList size={13} />
              </span>

              <span>Pharmacy Management</span>

              <ChevronRight
                size={14}
                className="text-zinc-600"
              />

              <span className="text-zinc-300">
                Prescriptions
              </span>
            </div>

            <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Prescriptions

              <Sparkles
                size={20}
                className="text-violet-400/70"
              />
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              Create, monitor and manage patient prescriptions.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-[#111113] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {canManagePrescriptions && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:brightness-110"
              >
                <Plus size={18} />
                <span>New Prescription</span>
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            SUCCESS MESSAGE
        ====================================================== */}

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-700/70 bg-[#052014] px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1 break-words">
              {successMessage}
            </div>

            <button
              type="button"
              aria-label="Dismiss success message"
              onClick={() => setSuccessMessage("")}
              className="shrink-0 rounded-lg p-1 text-emerald-300/60 transition hover:text-emerald-200"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* =====================================================
            ERROR MESSAGE
        ====================================================== */}

        {error && (
          <div
            role="alert"
            className="mb-6 flex min-w-0 items-start gap-3 rounded-2xl border border-red-700/70 bg-[#2b0a0a] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1 break-words">
              {error}
            </div>

            <button
              type="button"
              aria-label="Dismiss error message"
              onClick={() => setError("")}
              className="shrink-0 rounded-lg p-1 text-red-300/60 transition hover:text-red-200"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <div className="mb-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
            onClick={() =>
              handleStatusCardClick("partially_dispensed")
            }
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

        {/* =====================================================
            SEARCH AND FILTERS
        ====================================================== */}

        <div className="mb-5 min-w-0 rounded-2xl border border-zinc-800 bg-[#0b0b0d] p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
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
                placeholder="Search prescription number, customer, doctor or diagnosis..."
                aria-label="Search prescriptions"
                className="w-full min-w-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div className="relative w-full shrink-0 lg:w-56">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter by prescription status"
                className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 pr-10 text-sm text-zinc-200 outline-none transition-colors focus:border-violet-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="partially_dispensed">
                  Partially Dispensed
                </option>
                <option value="dispensed">Dispensed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
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
              <span className="rounded-full border border-violet-600/50 bg-[#111113] px-2.5 py-1 text-violet-300">
                Status: {getStatusLabel(statusFilter)}
              </span>
            )}
          </div>
        </div>

        {/* =====================================================
            PRESCRIPTIONS TABLE AND MOBILE CARDS
        ====================================================== */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b0d]">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <Loader2
                  size={30}
                  className="animate-spin text-violet-400"
                />

                <span className="text-sm">
                  Loading prescriptions...
                </span>
              </div>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              canCreate={canManagePrescriptions}
              onCreate={() => {
                setError("");
                setSuccessMessage("");
                setShowCreateModal(true);
              }}
              onClear={clearFilters}
            />
          ) : (
            <>
              {/* Desktop table */}

              <div className="hidden w-full overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0e0e11] text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">
                        Prescription
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Customer
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Doctor
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Date
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Medicines
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredPrescriptions.map((prescription) => {
                      const StatusIcon = getStatusIcon(
                        prescription.status
                      );

                      return (
                        <tr
                          key={prescription.id}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">
                              {prescription.prescriptionNumber || "—"}
                            </div>

                            <div className="mt-1 text-xs text-zinc-500">
                              ID #{prescription.id}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <IconBox
                                size="sm"
                                className="border-violet-800/50 bg-violet-950/30 text-violet-300"
                              >
                                <UserRound size={17} />
                              </IconBox>

                              <div className="min-w-0">
                                <div className="font-medium text-zinc-200">
                                  {getCustomerName(
                                    prescription.customer
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-zinc-500">
                                  {prescription.customer?.phone ||
                                    "No phone"}
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
                                License:{" "}
                                {prescription.doctorLicenseNumber}
                              </div>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                              <CalendarDays
                                size={15}
                                className="shrink-0 text-zinc-500"
                              />

                              {formatDate(
                                prescription.prescriptionDate
                              )}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                              <Package
                                size={15}
                                className="shrink-0 text-zinc-500"
                              />

                              {prescription.items?.length || 0}{" "}
                              {(prescription.items?.length || 0) === 1
                                ? "medicine"
                                : "medicines"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={prescription.status}
                              StatusIcon={StatusIcon}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleViewPrescription(prescription)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0b0b0d] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-violet-700 hover:text-white"
                              >
                                View
                                <ChevronRight size={14} />
                              </button>

                              {canManagePrescriptions &&
                                canCancelPrescription(prescription) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCancelModal(prescription)
                                    }
                                    className="rounded-lg border border-red-700/60 bg-red-950/30 p-2 text-red-300 transition hover:bg-red-950/60"
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

              {/* Mobile and tablet cards */}

              <div className="divide-y divide-zinc-800 lg:hidden">
                {filteredPrescriptions.map((prescription) => {
                  const StatusIcon = getStatusIcon(
                    prescription.status
                  );

                  return (
                    <div
                      key={prescription.id}
                      className="min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="break-words font-semibold text-white">
                            {prescription.prescriptionNumber || "—"}
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {formatDate(
                              prescription.prescriptionDate
                            )}
                          </div>
                        </div>

                        <StatusBadge
                          status={prescription.status}
                          StatusIcon={StatusIcon}
                        />
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserRound
                            size={16}
                            className="shrink-0 text-zinc-500"
                          />

                          <div className="min-w-0">
                            <div className="break-words text-sm font-medium text-zinc-200">
                              {getCustomerName(
                                prescription.customer
                              )}
                            </div>

                            <div className="text-xs text-zinc-500">
                              Patient
                            </div>
                          </div>
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <Stethoscope
                            size={16}
                            className="shrink-0 text-zinc-500"
                          />

                          <div className="min-w-0">
                            <div className="break-words text-sm text-zinc-300">
                              {prescription.doctorName || "—"}
                            </div>

                            <div className="text-xs text-zinc-500">
                              Prescribing doctor
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Package
                            size={16}
                            className="shrink-0 text-zinc-500"
                          />

                          <div className="text-sm text-zinc-300">
                            {prescription.items?.length || 0} medicines
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewPrescription(prescription)
                          }
                          className="flex-1 rounded-lg border border-zinc-800 bg-[#0b0b0d] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-violet-700 hover:text-white"
                        >
                          View Details
                        </button>

                        {canManagePrescriptions &&
                          canCancelPrescription(prescription) && (
                            <button
                              type="button"
                              onClick={() =>
                                openCancelModal(prescription)
                              }
                              aria-label={`Cancel ${prescription.prescriptionNumber}`}
                              className="rounded-lg border border-red-700/60 px-3 py-2 text-red-300 transition hover:bg-red-950/50"
                            >
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
          CREATE PRESCRIPTION MODAL
      ====================================================== */}

      {showCreateModal && (
        <ModalOverlay
          onClose={closeCreateModal}
          closeDisabled={submitting}
          labelledBy="create-prescription-title"
        >
          <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-2.5rem)]">
            {/* Modal header */}

            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id="create-prescription-title"
                  className="flex items-center gap-2 text-lg font-semibold text-white"
                >
                  <Sparkles
                    size={17}
                    className="shrink-0 text-violet-400"
                  />

                  New Prescription
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  Create a prescription for a registered customer.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                aria-label="Close create prescription form"
                className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal form */}

            <form
              onSubmit={handleCreatePrescription}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                <div className="space-y-7">
                  {/* Prescription information */}

                  <section>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-violet-400" />

                      <FileText
                        size={17}
                        className="text-violet-400"
                      />

                      <h3 className="font-semibold text-white">
                        Prescription Information
                      </h3>
                    </div>

                    <div className="grid min-w-0 gap-4 md:grid-cols-2">
                      <FormField label="Prescription Number (Optional)">
                        <input
                          type="text"
                          name="prescriptionNumber"
                          value={formData.prescriptionNumber}
                          onChange={handleFormChange}
                          placeholder="Leave blank to generate automatically"
                          className={inputClass}
                        />

                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          PharmaCore will generate a unique prescription number when
                          you leave this field blank.
                        </p>
                      </FormField>

                      <FormField
                        label="Prescription Date"
                        required
                      >
                        <input
                          type="date"
                          name="prescriptionDate"
                          value={formData.prescriptionDate}
                          onChange={handleFormChange}
                          className={inputClass}
                          required
                        />
                      </FormField>

                      <FormField label="Customer" required>
                        <select
                          name="customerId"
                          value={formData.customerId}
                          onChange={handleFormChange}
                          className={inputClass}
                          disabled={
                            loadingCustomers ||
                            customers.length === 0
                          }
                          required
                        >
                          <option value="">
                            {loadingCustomers
                              ? "Loading customers..."
                              : customers.length === 0
                                ? "No customers found — add a customer first"
                                : "Select a customer"}
                          </option>

                          {customers.map((customer) => (
                            <option
                              key={customer.id}
                              value={customer.id}
                            >
                              {getCustomerName(customer)}
                              {customer.phone
                                ? ` — ${customer.phone}`
                                : ""}
                            </option>
                          ))}
                        </select>

                        {!loadingCustomers &&
                          customers.length === 0 && (
                            <p className="mt-2 text-xs leading-5 text-amber-400">
                              No customers are available. Check the
                              Customers page and confirm that the
                              customers API returns their records.
                            </p>
                          )}
                      </FormField>

                      <FormField label="Doctor Name" required>
                        <input
                          type="text"
                          name="doctorName"
                          value={formData.doctorName}
                          onChange={handleFormChange}
                          placeholder="e.g. Dr. Kwame Mensah"
                          className={inputClass}
                          required
                        />
                      </FormField>

                      <FormField label="Diagnosis">
                        <input
                          type="text"
                          name="diagnosis"
                          value={formData.diagnosis}
                          onChange={handleFormChange}
                          placeholder="e.g. Bacterial infection"
                          className={inputClass}
                        />
                      </FormField>
                    </div>

                    <div className="mt-4">
                      <FormField label="Notes">
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleFormChange}
                          rows={3}
                          placeholder="Additional prescription notes..."
                          className={`${inputClass} resize-y`}
                        />
                      </FormField>
                    </div>
                  </section>

                  {/* Prescribed medicines */}

                  <section>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-violet-400" />

                        <Package
                          size={17}
                          className="text-violet-400"
                        />

                        <div>
                          <h3 className="font-semibold text-white">
                            Prescribed Medicines
                          </h3>

                          <p className="mt-0.5 text-xs leading-5 text-zinc-400">
                            Add each medicine and its dosage instructions.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-violet-700 hover:text-white"
                      >
                        <Plus size={15} />
                        Add Medicine
                      </button>
                    </div>

                    <div className="space-y-4">
                      {formItems.map((item, index) => (
                        <div
                          key={index}
                          className="min-w-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] p-3 sm:p-4"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                              Medicine {index + 1}
                            </span>

                            {formItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-950/30"
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="min-w-0 md:col-span-2 lg:col-span-3">
                              <FormField label="Medicine" required>
                                <select
                                  value={item.medicineId}
                                  onChange={(event) =>
                                    handleItemChange(
                                      index,
                                      "medicineId",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  disabled={loadingMedicines}
                                  required
                                >
                                  <option value="">
                                    {loadingMedicines
                                      ? "Loading medicines..."
                                      : "Select medicine"}
                                  </option>

                                  {medicines
                                    .filter(
                                      (medicine) =>
                                        medicine.isActive !== false
                                    )
                                    .map((medicine) => (
                                      <option
                                        key={medicine.id}
                                        value={medicine.id}
                                      >
                                        {medicine.name}
                                        {medicine.strength
                                          ? ` — ${medicine.strength}`
                                          : ""}
                                        {medicine.dosageForm
                                          ? ` (${medicine.dosageForm})`
                                          : ""}
                                      </option>
                                    ))}
                                </select>
                              </FormField>
                            </div>

                            <FormField label="Dosage" required>
                              <input
                                type="text"
                                value={item.dosage}
                                onChange={(event) =>
                                  handleItemChange(
                                    index,
                                    "dosage",
                                    event.target.value
                                  )
                                }
                                placeholder="e.g. 500mg"
                                className={inputClass}
                                required
                              />
                            </FormField>

                            <FormField label="Frequency" required>
                              <input
                                type="text"
                                value={item.frequency}
                                onChange={(event) =>
                                  handleItemChange(
                                    index,
                                    "frequency",
                                    event.target.value
                                  )
                                }
                                placeholder="e.g. 3 times daily"
                                className={inputClass}
                                required
                              />
                            </FormField>

                            <FormField label="Duration">
                              <input
                                type="text"
                                value={item.duration}
                                onChange={(event) =>
                                  handleItemChange(index, "duration", event.target.value)
                                }
                                placeholder="e.g. 7 days"
                                className={inputClass}
                              />
                            </FormField>

                            <FormField label="Quantity" required>
                              <div className="flex min-w-0 items-center overflow-hidden rounded-xl border border-zinc-800 bg-[#0b0b0d]">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() =>
                                    handleItemChange(
                                      index,
                                      "quantity",
                                      Math.max(
                                        1,
                                        Number(item.quantity || 1) - 1
                                      )
                                    )
                                  }
                                  className="shrink-0 px-3 py-3 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                >
                                  <Minus size={15} />
                                </button>

                                <input
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
                                  className="w-full min-w-0 bg-transparent px-2 py-2.5 text-center text-sm text-white outline-none"
                                  required
                                />

                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() =>
                                    handleItemChange(
                                      index,
                                      "quantity",
                                      Number(item.quantity || 1) + 1
                                    )
                                  }
                                  className="shrink-0 px-3 py-3 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            </FormField>

                            <div className="min-w-0 md:col-span-2 lg:col-span-2">
                              <FormField label="Instructions">
                                <input
                                  type="text"
                                  value={item.instructions}
                                  onChange={(event) =>
                                    handleItemChange(
                                      index,
                                      "instructions",
                                      event.target.value
                                    )
                                  }
                                  placeholder="e.g. Take after meals."
                                  className={inputClass}
                                />
                              </FormField>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Form footer */}

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-zinc-800 bg-[#0e0e11] px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={submitting}
                  className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin text-white"
                      />

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
          PRESCRIPTION DETAILS MODAL
      ====================================================== */}

      {showDetailsModal && selectedPrescription && (
        <ModalOverlay
          onClose={closeDetailsModal}
          labelledBy="prescription-details-title"
        >
          <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-2.5rem)]">
            {/* Details header */}

            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="prescription-details-title"
                    className="break-words text-lg font-semibold text-white"
                  >
                    {selectedPrescription.prescriptionNumber}
                  </h2>

                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                      selectedPrescription.status
                    )}`}
                  >
                    {getStatusLabel(
                      selectedPrescription.status
                    )}
                  </span>
                </div>

                <p className="mt-1 text-xs text-zinc-500">
                  Prescription ID #{selectedPrescription.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                aria-label="Close prescription details"
                className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            {/* Details body */}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
              {loadingDetails ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <Loader2
                      size={28}
                      className="animate-spin text-violet-400"
                    />

                    <span className="text-sm">
                      Loading prescription...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Patient and prescriber */}

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <InfoPanel
                      icon={UserRound}
                      title="Patient"
                    >
                      <div className="break-words font-semibold text-white">
                        {getCustomerName(
                          selectedPrescription.customer
                        )}
                      </div>

                      {selectedPrescription.customer?.phone && (
                        <div className="mt-2 text-sm text-zinc-400">
                          {selectedPrescription.customer.phone}
                        </div>
                      )}

                      {selectedPrescription.customer?.email && (
                        <div className="mt-1 flex min-w-0 items-start gap-2 text-sm text-zinc-400">
                          <Mail
                            size={14}
                            className="mt-1 shrink-0"
                          />

                          <span className="min-w-0 break-all">
                            {selectedPrescription.customer.email}
                          </span>
                        </div>
                      )}
                    </InfoPanel>

                    <InfoPanel
                      icon={Stethoscope}
                      title="Prescriber"
                    >
                      <div className="break-words font-semibold text-white">
                        {selectedPrescription.doctorName || "—"}
                      </div>
                    </InfoPanel>
                  </div>

                  {/* General details */}

                  <div className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailValue
                        label="Prescription Date"
                        value={formatDate(
                          selectedPrescription.prescriptionDate
                        )}
                      />

                      <DetailValue
                        label="Diagnosis"
                        value={
                          selectedPrescription.diagnosis || "—"
                        }
                      />

                      <DetailValue
                        label="Created By"
                        value={getCreatorName(
                          selectedPrescription.creator
                        )}
                      />

                      <DetailValue
                        label="Created"
                        value={formatDateTime(
                          selectedPrescription.createdAt
                        )}
                      />
                    </div>
                  </div>

                  {/* Medicine details */}

                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-violet-400" />

                      <Package
                        size={17}
                        className="text-violet-400"
                      />

                      <h3 className="font-semibold text-white">
                        Prescribed Medicines
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {selectedPrescription.items?.length ? (
                        selectedPrescription.items.map((item) => (
                          <div
                            key={item.id}
                            className="min-w-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4"
                          >
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="break-words font-semibold text-white">
                                  {getMedicineName(item.medicine)}
                                </div>

                                <div className="mt-1 break-words text-sm text-zinc-400">
                                  {getMedicineDescription(
                                    item.medicine
                                  )}
                                </div>

                                {item.medicine?.sku && (
                                  <div className="mt-1 text-xs text-zinc-500">
                                    SKU: {item.medicine.sku}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 rounded-xl border border-violet-700/60 bg-violet-950/10 px-3 py-2 sm:text-right">
                                <div className="text-xs text-zinc-400">
                                  Quantity prescribed
                                </div>

                                <div className="text-lg font-bold text-violet-300">
                                  {item.quantity}
                                </div>

                                <div className="text-xs text-zinc-400">
                                  Dispensed:{" "}
                                  {item.dispensedQuantity ?? 0}
                                </div>

                                <div className="text-xs text-zinc-400">
                                  Remaining:{" "}
                                  {Math.max(
                                    0,
                                    Number(item.quantity || 0) -
                                      Number(
                                        item.dispensedQuantity || 0
                                      )
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
                              <DetailValue
                                label="Dosage"
                                value={item.dosage || "—"}
                              />

                              <DetailValue
                                label="Frequency"
                                value={item.frequency || "—"}
                              />

                              <DetailValue
                                label="Duration"
                                value={item.duration || "—"}
                              />
                            </div>

                            {item.instructions && (
                              <div className="mt-4 rounded-xl border border-zinc-800 bg-[#111113] p-3">
                                <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                  Instructions
                                </div>

                                <div className="mt-1 break-words text-sm leading-6 text-zinc-300">
                                  {item.instructions}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
                          No prescription items found.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Notes */}

                  {selectedPrescription.notes && (
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-violet-400" />

                        <FileText
                          size={17}
                          className="text-violet-400"
                        />

                        <h3 className="font-semibold text-white">
                          Notes
                        </h3>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4 text-sm leading-6 text-zinc-300">
                        {selectedPrescription.notes}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Details footer */}

            <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-800 bg-[#0e0e11] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-xs leading-5 text-zinc-400">
                {selectedPrescription.status === "active"
                  ? "This prescription is active."
                  : selectedPrescription.status ===
                      "partially_dispensed"
                    ? "Dispensing has started for this prescription."
                    : selectedPrescription.status === "dispensed"
                      ? "This prescription has been fully dispensed."
                      : selectedPrescription.status === "cancelled"
                        ? "This prescription has been cancelled."
                        : "Prescription status information."}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closeDetailsModal}
                  className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                >
                  Close
                </button>

                {canManagePrescriptions &&
                  canCancelPrescription(selectedPrescription) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailsModal(false);
                        openCancelModal(selectedPrescription);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-700/60 bg-red-950/30 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/60"
                    >
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
          CANCEL PRESCRIPTION MODAL
      ====================================================== */}

      {showCancelModal && prescriptionToCancel && (
        <ModalOverlay
          onClose={closeCancelModal}
          closeDisabled={submitting}
          labelledBy="cancel-prescription-title"
        >
          <div className="relative w-full max-w-md min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] p-5 shadow-2xl shadow-black/50 sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-800/50 bg-red-950/60 text-red-300">
              <AlertCircle size={24} />
            </div>

            <h2
              id="cancel-prescription-title"
              className="mt-5 text-lg font-semibold text-white"
            >
              Cancel Prescription?
            </h2>

            <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
              You are about to cancel prescription{" "}
              <span className="font-medium text-zinc-200">
                {prescriptionToCancel.prescriptionNumber}
              </span>{" "}
              for{" "}
              <span className="font-medium text-zinc-200">
                {getCustomerName(
                  prescriptionToCancel.customer
                )}
              </span>
              .
            </p>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              This changes the prescription status rather than
              permanently deleting its record. Prescriptions that
              have started dispensing cannot be cancelled through
              this action.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={submitting}
                className="rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
              >
                Keep Prescription
              </button>

              <button
                type="button"
                onClick={handleCancelPrescription}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin text-white"
                    />

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
// Reusable Form Field
// =====================================================

const FormField = ({
  label,
  required = false,
  children
}) => (
  <label className="block min-w-0">
    <div className="mb-2 text-xs font-medium text-zinc-400">
      {label}

      {required && (
        <span className="ml-1 text-red-400">*</span>
      )}
    </div>

    {children}
  </label>
);

// =====================================================
// Statistics Card
// =====================================================

const StatCard = ({
  label,
  value,
  icon: Icon,
  description,
  accent = "violet",
  active = false,
  onClick
}) => {
  const accents = {
    violet: {
      iconBg: "bg-violet-950/60 text-violet-300",
      activeBorder: "border-violet-600/70",
      activeRing: "ring-violet-500/10"
    },

    sky: {
      iconBg: "bg-sky-950/60 text-sky-300",
      activeBorder: "border-sky-600/70",
      activeRing: "ring-sky-500/10"
    },

    amber: {
      iconBg: "bg-amber-950/60 text-amber-300",
      activeBorder: "border-amber-600/70",
      activeRing: "ring-amber-500/10"
    },

    emerald: {
      iconBg: "bg-emerald-950/60 text-emerald-300",
      activeBorder: "border-emerald-600/70",
      activeRing: "ring-emerald-500/10"
    },

    rose: {
      iconBg: "bg-red-950/60 text-rose-300",
      activeBorder: "border-rose-600/70",
      activeRing: "ring-rose-500/10"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full min-w-0 rounded-xl border bg-[#0e0e11] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 ${
        active
          ? `${style.activeBorder} ring-2 ${style.activeRing}`
          : "border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-zinc-500">
            {label}
          </div>

          <div className="mt-2 text-2xl font-bold text-white">
            {value}
          </div>

          <div className="mt-1 break-words text-xs leading-5 text-zinc-500">
            {description}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-3 text-xs text-zinc-400">
        {active ? "Currently selected" : "Click to filter"}
      </div>
    </button>
  );
};

// =====================================================
// Status Badge
// =====================================================

const StatusBadge = ({
  status,
  StatusIcon
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClasses(
      status
    )}`}
  >
    <StatusIcon size={13} />
    {getStatusLabel(status)}
  </span>
);

// =====================================================
// Information Panel
// =====================================================

const InfoPanel = ({
  icon: Icon,
  title,
  children
}) => (
  <div className="min-w-0 rounded-xl border border-zinc-800 bg-[#0b0b0d] p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
      <Icon
        size={15}
        className="shrink-0 text-violet-400"
      />

      {title}
    </div>

    <div className="min-w-0">
      {children}
    </div>
  </div>
);

// =====================================================
// Detail Value
// =====================================================

const DetailValue = ({
  label,
  value
}) => (
  <div className="min-w-0">
    <div className="text-xs uppercase tracking-wider text-zinc-600">
      {label}
    </div>

    <div className="mt-1 break-words text-sm leading-5 text-zinc-300">
      {value}
    </div>
  </div>
);

// =====================================================
// Empty State
// =====================================================

const EmptyState = ({
  hasFilters,
  onCreate,
  onClear,
  canCreate
}) => (
  <div className="flex min-h-[250px] flex-col items-center justify-center px-6 py-10 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-800 bg-[#0f0f11] text-violet-300">
      <ClipboardList size={26} />
    </div>

    <h3 className="mt-5 text-base font-semibold text-white">
      {hasFilters
        ? "No matching prescriptions"
        : "No prescriptions yet"}
    </h3>

    <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
      {hasFilters
        ? "No prescriptions match the current search and status filters. Try changing your search or clearing the filters."
        : "Create the first prescription to start tracking patient medication orders."}
    </p>

    <div className="mt-5 flex flex-wrap justify-center gap-3">
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0b0b0d] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
        >
          <X size={16} />
          Clear filters
        </button>
      )}

      {!hasFilters && canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5b21b6] to-[#b91cdb] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus size={17} />
          New Prescription
        </button>
      )}
    </div>
  </div>
);

// =====================================================
// Modal Overlay
// - Centers modal in the viewport
// - Locks background scrolling
// - Closes with Escape
// - Closes on backdrop click when allowed
// =====================================================

const ModalOverlay = ({
  children,
  onClose,
  closeDisabled = false,
  labelledBy
}) => {
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  }, [onClose, closeDisabled]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (closeDisabledRef.current) return;

        event.preventDefault();
        onCloseRef.current?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-x-hidden overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (closeDisabledRef.current) {
          return;
        }

        onCloseRef.current?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="my-auto flex w-full min-w-0 justify-center"
      >
        {children}
      </div>
    </div>
  );
};

export default Prescriptions;

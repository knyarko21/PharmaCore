
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
  X
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ======================================================
// Helpers
// ======================================================

const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getInitials = (supplier) => {
  const name = supplier?.name || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "SU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
};

// ======================================================
// Empty form
// ======================================================

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  licenseNumber: ""
};

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
// Main Component
// ======================================================

const Suppliers = () => {
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  // ----------------------------------------------
  // Permissions
  // ----------------------------------------------

  const canManage =
    user?.role === "admin" ||
    user?.role === "pharmacist" ||
    user?.role === "inventory_manager";

  const canDeactivate =
    user?.role === "admin" ||
    user?.role === "inventory_manager";

  // ----------------------------------------------
  // Fetch suppliers
  // ----------------------------------------------

  const fetchSuppliers = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      setError("");

      const response = await api.get("/suppliers");

      if (response.data?.success) {
        setSuppliers(response.data.suppliers || []);
      } else {
        setSuppliers([]);
      }
    } catch (requestError) {
      console.error("Fetch suppliers error:", requestError);

      setError(
        getErrorMessage(requestError, "Unable to load suppliers.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // ----------------------------------------------
  // Filtering
  // ----------------------------------------------

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      const searchableText = [
        supplier.name,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
        supplier.licenseNumber
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [suppliers, searchTerm]);

  // ----------------------------------------------
  // Stats
  // ----------------------------------------------

  const stats = useMemo(() => {
    const total = suppliers.length;

    const withEmail = suppliers.filter((s) =>
      Boolean(s.email)
    ).length;

    const withPhone = suppliers.filter((s) =>
      Boolean(s.phone)
    ).length;

    const withLicense = suppliers.filter((s) =>
      Boolean(s.licenseNumber)
    ).length;

    return { total, withEmail, withPhone, withLicense };
  }, [suppliers]);

  // ----------------------------------------------
  // Modal handlers
  // ----------------------------------------------

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setFormError("");
    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      licenseNumber: supplier.licenseNumber || ""
    });
    setFormError("");
    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  };

  const openDetailsModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const openDeactivateModal = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDeactivateModal(true);
  };

  const closeFormModal = () => {
    if (submitting) return;

    setShowFormModal(false);
    setEditingSupplier(null);
    setForm(emptyForm);
    setFormError("");
  };

  // ----------------------------------------------
  // Form handlers
  // ----------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    if (formError) setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!form.name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }

    if (form.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(form.email.trim())) {
        setFormError("Please provide a valid email address.");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined
      };

      let response;

      if (editingSupplier) {
        response = await api.put(
          `/suppliers/${editingSupplier.id}`,
          payload
        );
      } else {
        response = await api.post("/suppliers", payload);
      }

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to save supplier."
        );
      }

      setSuccessMessage(
        editingSupplier
          ? "Supplier updated successfully."
          : "Supplier created successfully."
      );

      setShowFormModal(false);
      setEditingSupplier(null);
      setForm(emptyForm);

      await fetchSuppliers(false);
    } catch (requestError) {
      console.error("Save supplier error:", requestError);

      setFormError(
        getErrorMessage(requestError, "Unable to save supplier.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------
  // Deactivate
  // ----------------------------------------------

  const handleDeactivate = async () => {
    if (!selectedSupplier) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await api.delete(
        `/suppliers/${selectedSupplier.id}`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to deactivate supplier."
        );
      }

      setSuccessMessage("Supplier deactivated successfully.");

      setShowDeactivateModal(false);
      setSelectedSupplier(null);

      await fetchSuppliers(false);
    } catch (requestError) {
      console.error("Deactivate supplier error:", requestError);

      setError(
        getErrorMessage(
          requestError,
          "Unable to deactivate supplier."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------
  // Loading
  // ----------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <Truck size={28} className="text-violet-400" />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading suppliers
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Fetching your vendor directory...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------
  // Main render
  // ----------------------------------------------

  return (
    <div className="relative min-h-full overflow-hidden text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <Truck size={16} />
              <span>Pharmacy Management</span>
              <ChevronRight size={14} />
              <span className="text-zinc-300">Suppliers</span>
            </div>

            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Suppliers
              <Sparkles size={20} className="text-violet-400/70" />
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Manage your vendor directory and contact details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSuppliers(false)}
              disabled={refreshing}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : "transition-transform duration-500 group-hover:rotate-180"
                }
              />
              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Plus size={17} className="relative" />
                <span className="relative">Add Supplier</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && !showFormModal && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">Supplier operation failed</p>
              <p className="mt-1 text-red-300/70">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 text-red-300/60 transition hover:bg-red-500/10 hover:text-red-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent px-4 py-3 text-sm text-emerald-300 backdrop-blur-sm">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="ml-auto rounded-lg p-1 text-emerald-300/60 transition hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Suppliers"
            value={stats.total}
            icon={Truck}
            description="Active vendor records"
            accent="violet"
          />

          <StatCard
            label="With Phone"
            value={stats.withPhone}
            icon={Phone}
            description="Suppliers with a phone number"
            accent="sky"
          />

          <StatCard
            label="With Email"
            value={stats.withEmail}
            icon={Mail}
            description="Suppliers with an email address"
            accent="fuchsia"
          />

          <StatCard
            label="Licensed"
            value={stats.withLicense}
            icon={ShieldCheck}
            description="Suppliers with a license number"
            accent="emerald"
          />
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Supplier Directory
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {filteredSuppliers.length} supplier
                {filteredSuppliers.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search by name, contact, phone or license..."
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08]"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <EmptyState
              hasSearch={Boolean(searchTerm.trim())}
              onAdd={canManage ? openCreateModal : undefined}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">
                        Supplier
                      </th>
                      <th className="px-5 py-4 font-medium">
                        Contact Person
                      </th>
                      <th className="px-5 py-4 font-medium">Phone</th>
                      <th className="px-5 py-4 font-medium">Email</th>
                      <th className="px-5 py-4 font-medium">
                        License
                      </th>
                      <th className="px-5 py-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSuppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="group transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar supplier={supplier} />

                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {supplier.name}
                              </p>

                              <p className="mt-0.5 text-xs text-zinc-500">
                                Supplier #{supplier.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-300">
                          {supplier.contactPerson || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-300">
                          {supplier.phone || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-400">
                          {supplier.email || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {supplier.licenseNumber ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-medium text-emerald-400">
                              {supplier.licenseNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">
                              No license
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <ActionButton
                              icon={Eye}
                              label="View"
                              onClick={() =>
                                openDetailsModal(supplier)
                              }
                            />

                            {canManage && (
                              <ActionButton
                                icon={Edit3}
                                label="Edit"
                                onClick={() =>
                                  openEditModal(supplier)
                                }
                              />
                            )}

                            {canDeactivate && (
                              <ActionButton
                                icon={Trash2}
                                label="Deactivate"
                                danger
                                onClick={() =>
                                  openDeactivateModal(supplier)
                                }
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-white/[0.04] md:hidden">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar supplier={supplier} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">
                              {supplier.name}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Supplier #{supplier.id}
                            </p>
                          </div>

                          {supplier.licenseNumber && (
                            <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                              Licensed
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          {supplier.contactPerson && (
                            <div className="flex items-center gap-2 text-zinc-400">
                              <UserRound size={14} />
                              <span>{supplier.contactPerson}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-zinc-400">
                            <Phone size={14} />
                            <span>{supplier.phone || "No phone"}</span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-400">
                            <Mail size={14} />
                            <span className="truncate">
                              {supplier.email || "No email"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDetailsModal(supplier)
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]"
                          >
                            <Eye size={14} />
                            View
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(supplier)
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]"
                            >
                              <Edit3 size={14} />
                              Edit
                            </button>
                          )}

                          {canDeactivate && (
                            <button
                              type="button"
                              onClick={() =>
                                openDeactivateModal(supplier)
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/[0.12]"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          Create / Edit Modal
      ====================================================== */}

      {showFormModal && (
        <Modal
          title={
            editingSupplier ? "Edit Supplier" : "Add Supplier"
          }
          subtitle={
            editingSupplier
              ? "Update this supplier's information."
              : "Create a new vendor record."
          }
          onClose={closeFormModal}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              {formError && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-sm text-red-300">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <SectionTitle>
                    Supplier Information
                  </SectionTitle>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Supplier Name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Kumasi Medical Distributors"
                      icon={Building2}
                      required
                      fullWidth
                    />

                    <FormField
                      label="Contact Person"
                      name="contactPerson"
                      value={form.contactPerson}
                      onChange={handleChange}
                      placeholder="e.g. Akosua Boateng"
                      icon={UserRound}
                    />

                    <FormField
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="e.g. +233244567890"
                      icon={Phone}
                      required
                    />

                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="orders@supplier.gh"
                      icon={Mail}
                    />

                    <FormField
                      label="License Number"
                      name="licenseNumber"
                      value={form.licenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. GNDP-2024-0451"
                      icon={ShieldCheck}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Address
                    </label>

                    <div className="relative">
                      <MapPin
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-3.5 text-zinc-500"
                      />

                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="e.g. Plot 42, Adum Industrial Area, Kumasi"
                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#111113] py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.08]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.06] bg-[#0e0e11]/95 px-5 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={submitting}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:shadow-xl hover:shadow-violet-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {editingSupplier
                      ? "Save Changes"
                      : "Create Supplier"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================
          Supplier Details Modal
      ====================================================== */}

      {showDetailsModal && selectedSupplier && (
        <Modal
          title="Supplier Details"
          subtitle={`Supplier #${selectedSupplier.id}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSupplier(null);
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-6">
                <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.06] to-transparent p-4">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

                  <Avatar supplier={selectedSupplier} large />

                  <div className="relative">
                    <h3 className="text-lg font-semibold text-white">
                      {selectedSupplier.name}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedSupplier.contactPerson ||
                        "No contact person recorded"}
                    </p>
                  </div>
                </div>

                <div>
                  <SectionTitle>Contact Information</SectionTitle>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={selectedSupplier.phone}
                    />

                    <DetailItem
                      icon={Mail}
                      label="Email"
                      value={selectedSupplier.email}
                    />

                    <DetailItem
                      icon={UserRound}
                      label="Contact Person"
                      value={selectedSupplier.contactPerson}
                    />

                    <DetailItem
                      icon={ShieldCheck}
                      label="License Number"
                      value={selectedSupplier.licenseNumber}
                    />

                    <DetailItem
                      icon={MapPin}
                      label="Address"
                      value={selectedSupplier.address}
                      full
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-white/[0.06] bg-[#0e0e11]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSupplier(null);
                }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Close
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedSupplier);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
                >
                  <Edit3 size={16} />
                  Edit Supplier
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================
          Deactivate Modal
      ====================================================== */}

      {showDeactivateModal && selectedSupplier && (
        <Modal
          title="Deactivate Supplier"
          subtitle="This will remove the supplier from the active directory."
          onClose={() => {
            if (!submitting) {
              setShowDeactivateModal(false);
              setSelectedSupplier(null);
            }
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-4">
                  <AlertCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />

                  <div>
                    <p className="font-medium text-amber-200">
                      Are you sure?
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-200/70">
                      You are about to deactivate{" "}
                      <span className="font-semibold text-amber-100">
                        {selectedSupplier.name}
                      </span>
                      . Existing purchase orders referencing this
                      supplier will remain intact, but you won't be
                      able to create new ones.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-sm text-red-300">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.06] bg-[#0e0e11]/95 px-5 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedSupplier(null);
                  setError("");
                }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleDeactivate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:shadow-xl hover:shadow-red-600/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Deactivate
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ======================================================
// Stat Card
// ======================================================

const StatCard = ({
  label,
  value,
  icon: Icon,
  description,
  accent = "violet"
}) => {
  const accents = {
    violet: {
      gradient: "from-violet-500/[0.14]",
      icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20"
    },
    sky: {
      gradient: "from-sky-500/[0.14]",
      icon: "bg-sky-500/10 text-sky-400 ring-sky-500/20"
    },
    fuchsia: {
      gradient: "from-fuchsia-500/[0.14]",
      icon: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20"
    },
    emerald: {
      gradient: "from-emerald-500/[0.14]",
      icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
    }
  };

  const style = accents[accent] || accents.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:shadow-2xl hover:shadow-black/30">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.gradient} to-transparent`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-zinc-600">{description}</p>
        </div>

        <IconBox size="lg" className={style.icon}>
          <Icon size={19} />
        </IconBox>
      </div>
    </div>
  );
};

// ======================================================
// Avatar
// ======================================================

const Avatar = ({ supplier, large = false }) => {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] font-semibold text-violet-300 shadow-inner ${
        large ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm"
      }`}
    >
      {getInitials(supplier)}
    </div>
  );
};

// ======================================================
// Action Button
// ======================================================

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  danger = false
}) => {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition-all ${
        danger
          ? "text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          : "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon size={16} />
    </button>
  );
};

// ======================================================
// Form Field
// ======================================================

const FormField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  required = false,
  fullWidth = false
}) => {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
        {required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-xl border border-white/[0.08] bg-[#111113] py-2.5 pr-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.08] ${
            Icon ? "pl-10" : "pl-3"
          }`}
        />
      </div>
    </div>
  );
};

// ======================================================
// Detail Item
// ======================================================

const DetailItem = ({
  icon: Icon,
  label,
  value,
  full = false
}) => {
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition hover:border-white/[0.12] ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Icon size={14} />
        <span>{label}</span>
      </div>

      <p className="mt-2 break-words text-sm text-zinc-200">
        {value || "Not provided"}
      </p>
    </div>
  );
};

// ======================================================
// Section Title
// ======================================================

const SectionTitle = ({ children }) => {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
      <span className="h-1 w-1 rounded-full bg-violet-400" />
      {children}
    </h3>
  );
};

// ======================================================
// Modal
// ======================================================

const Modal = ({ title, subtitle, onClose, children }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/80 p-2 backdrop-blur-md sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e11]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:max-h-[90vh]">
        <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        <div className="flex shrink-0 items-start justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-zinc-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

// ======================================================
// Empty State
// ======================================================

const EmptyState = ({ hasSearch, onAdd }) => {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] to-transparent text-zinc-500">
        <div className="absolute inset-0 rounded-2xl bg-violet-500/5 blur-xl" />

        <div className="relative">
          {hasSearch ? <Search size={24} /> : <Truck size={24} />}
        </div>
      </div>

      <h3 className="mt-4 font-semibold text-white">
        {hasSearch ? "No suppliers found" : "No suppliers yet"}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        {hasSearch
          ? "Try adjusting your search terms."
          : "Create your first supplier to start recording purchases and receiving stock."}
      </p>

      {!hasSearch && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      )}
    </div>
  );
};

export default Suppliers;
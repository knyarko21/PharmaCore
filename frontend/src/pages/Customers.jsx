
import {
  AlertCircle,
  CalendarDays,
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
  Sparkles,
  Trash2,
  User,
  Users,
  X
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ======================================================
// Helpers
// ======================================================

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

const getCustomerName = (customer) => {
  return `${customer?.firstName || ""} ${
    customer?.lastName || ""
  }`.trim() || "Unnamed Customer";
};

const getInitials = (customer) => {
  const first = customer?.firstName?.charAt(0) || "";
  const last = customer?.lastName?.charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "CU";
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

// ======================================================
// Empty form
// ======================================================

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: ""
};

// ======================================================
// Main Component
// ======================================================

const Customers = () => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const canCreate =
    user?.role === "admin" ||
    user?.role === "pharmacist" ||
    user?.role === "cashier";

  const canEdit =
    user?.role === "admin" ||
    user?.role === "pharmacist" ||
    user?.role === "cashier";

  const canDeactivate =
    user?.role === "admin" ||
    user?.role === "pharmacist";

  const fetchCustomers = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await api.get("/customers");

      if (response.data?.success) {
        setCustomers(response.data.customers || []);
      } else {
        setCustomers([]);
      }
    } catch (requestError) {
      console.error("Fetch customers error:", requestError);

      setError(
        getErrorMessage(requestError, "Unable to load customers.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      const searchableText = [
        customer.firstName,
        customer.lastName,
        customer.phone,
        customer.email,
        customer.gender,
        customer.address
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [customers, searchTerm]);

  const stats = useMemo(() => {
    const total = customers.length;

    const withEmail = customers.filter(
      (customer) => Boolean(customer.email)
    ).length;

    const withPhone = customers.filter(
      (customer) => Boolean(customer.phone)
    ).length;

    const male = customers.filter(
      (customer) => customer.gender === "male"
    ).length;

    const female = customers.filter(
      (customer) => customer.gender === "female"
    ).length;

    return { total, withEmail, withPhone, male, female };
  }, [customers]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);

    setForm({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      email: customer.email || "",
      dateOfBirth: customer.dateOfBirth
        ? String(customer.dateOfBirth).slice(0, 10)
        : "",
      gender: customer.gender || "",
      address: customer.address || "",
      emergencyContactName: customer.emergencyContactName || "",
      emergencyContactPhone: customer.emergencyContactPhone || ""
    });

    setError("");
    setSuccessMessage("");
    setShowFormModal(true);
  };

  const openDetailsModal = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const openDeactivateModal = (customer) => {
    setSelectedCustomer(customer);
    setShowDeactivateModal(true);
  };

  const closeFormModal = () => {
    if (submitting) return;

    setShowFormModal(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        emergencyContactName:
          form.emergencyContactName.trim() || undefined,
        emergencyContactPhone:
          form.emergencyContactPhone.trim() || undefined
      };

      let response;

      if (editingCustomer) {
        response = await api.put(
          `/customers/${editingCustomer.id}`,
          payload
        );
      } else {
        response = await api.post("/customers", payload);
      }

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to save customer."
        );
      }

      setSuccessMessage(
        editingCustomer
          ? "Customer updated successfully."
          : "Customer created successfully."
      );

      setShowFormModal(false);
      setEditingCustomer(null);
      setForm(emptyForm);

      await fetchCustomers(false);
    } catch (requestError) {
      console.error("Save customer error:", requestError);

      setError(
        getErrorMessage(
          requestError,
          "Unable to save customer."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await api.delete(
        `/customers/${selectedCustomer.id}`
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to deactivate customer."
        );
      }

      setSuccessMessage("Customer deactivated successfully.");

      setShowDeactivateModal(false);
      setSelectedCustomer(null);

      await fetchCustomers(false);
    } catch (requestError) {
      console.error("Deactivate customer error:", requestError);

      setError(
        getErrorMessage(
          requestError,
          "Unable to deactivate customer."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <Users size={28} className="text-violet-400" />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading customers
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Fetching customer records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#08080a] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <Users size={16} />
              <span>Pharmacy Management</span>
              <ChevronRight size={14} />
              <span className="text-zinc-300">Customers</span>
            </div>

            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Customers
              <Sparkles size={20} className="text-violet-400/70" />
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Manage customer records and contact information.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchCustomers(false)}
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

            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Plus size={17} className="relative" />
                <span className="relative">Add Customer</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && !showFormModal && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">Customer operation failed</p>
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
            label="Total Customers"
            value={stats.total}
            icon={Users}
            description="Active customer records"
            accent="violet"
          />

          <StatCard
            label="With Phone"
            value={stats.withPhone}
            icon={Phone}
            description="Customers with contact numbers"
            accent="cyan"
          />

          <StatCard
            label="With Email"
            value={stats.withEmail}
            icon={Mail}
            description="Customers with email addresses"
            accent="fuchsia"
          />

          <StatCard
            label="Gender Records"
            value={stats.male + stats.female}
            icon={User}
            description="Customers with gender recorded"
            accent="amber"
          />
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Customer Directory
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {filteredCustomers.length} customer
                {filteredCustomers.length === 1 ? "" : "s"} found
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
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, phone or email..."
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

          {filteredCustomers.length === 0 ? (
            <EmptyState
              hasSearch={Boolean(searchTerm.trim())}
              onAdd={canCreate ? openCreateModal : undefined}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.015] text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-5 py-4 font-medium">
                        Customer
                      </th>
                      <th className="px-5 py-4 font-medium">Phone</th>
                      <th className="px-5 py-4 font-medium">Email</th>
                      <th className="px-5 py-4 font-medium">Gender</th>
                      <th className="px-5 py-4 font-medium">
                        Date of Birth
                      </th>
                      <th className="px-5 py-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="group transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar customer={customer} />

                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {getCustomerName(customer)}
                              </p>

                              <p className="mt-0.5 text-xs text-zinc-500">
                                Customer #{customer.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-300">
                          {customer.phone || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-400">
                          {customer.email || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <GenderBadge gender={customer.gender} />
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-400">
                          {formatDate(customer.dateOfBirth)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <ActionButton
                              icon={Eye}
                              label="View"
                              onClick={() =>
                                openDetailsModal(customer)
                              }
                            />

                            {canEdit && (
                              <ActionButton
                                icon={Edit3}
                                label="Edit"
                                onClick={() =>
                                  openEditModal(customer)
                                }
                              />
                            )}

                            {canDeactivate && (
                              <ActionButton
                                icon={Trash2}
                                label="Deactivate"
                                danger
                                onClick={() =>
                                  openDeactivateModal(customer)
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

              <div className="divide-y divide-white/[0.04] md:hidden">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar customer={customer} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">
                              {getCustomerName(customer)}
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-500">
                              Customer #{customer.id}
                            </p>
                          </div>

                          <GenderBadge gender={customer.gender} />
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Phone size={14} />
                            <span>{customer.phone || "No phone"}</span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-400">
                            <Mail size={14} />
                            <span className="truncate">
                              {customer.email || "No email"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openDetailsModal(customer)
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]"
                          >
                            <Eye size={14} />
                            View
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(customer)
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]"
                            >
                              <Edit3 size={14} />
                              Edit
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
          Create / Edit Modal — sticky header + scrollable body + pinned footer
      ====================================================== */}

      {showFormModal && (
        <Modal
          title={
            editingCustomer ? "Edit Customer" : "Add Customer"
          }
          subtitle={
            editingCustomer
              ? "Update the customer's information."
              : "Create a new customer record."
          }
          onClose={closeFormModal}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-3 text-sm text-red-300">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-7">
                <div>
                  <SectionTitle>Personal Information</SectionTitle>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="First Name"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Kelly"
                      required
                    />

                    <FormField
                      label="Last Name"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Nyarko"
                      required
                    />

                    <FormField
                      label="Phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="e.g. 0241234567"
                      required
                    />

                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="customer@example.com"
                    />

                    <FormField
                      label="Date of Birth"
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                    />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                        Gender
                      </label>

                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/[0.08] bg-[#111113] px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.08]"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionTitle>Address</SectionTitle>

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Customer address"
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#111113] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.08]"
                  />
                </div>

                <div>
                  <SectionTitle>Emergency Contact</SectionTitle>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Contact Name"
                      name="emergencyContactName"
                      value={form.emergencyContactName}
                      onChange={handleChange}
                      placeholder="Emergency contact"
                    />

                    <FormField
                      label="Contact Phone"
                      name="emergencyContactPhone"
                      value={form.emergencyContactPhone}
                      onChange={handleChange}
                      placeholder="Emergency phone"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned footer */}
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
                    {editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================
          Customer Details Modal — sticky header + scrollable body + pinned footer
      ====================================================== */}

      {showDetailsModal && selectedCustomer && (
        <Modal
          title="Customer Details"
          subtitle={`Customer #${selectedCustomer.id}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCustomer(null);
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-6">
                <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.06] to-transparent p-4">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

                  <Avatar customer={selectedCustomer} large />

                  <div className="relative">
                    <h3 className="text-lg font-semibold text-white">
                      {getCustomerName(selectedCustomer)}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Customer since{" "}
                      {formatDate(selectedCustomer.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <SectionTitle>Contact Information</SectionTitle>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={selectedCustomer.phone}
                    />

                    <DetailItem
                      icon={Mail}
                      label="Email"
                      value={selectedCustomer.email}
                    />

                    <DetailItem
                      icon={CalendarDays}
                      label="Date of Birth"
                      value={formatDate(selectedCustomer.dateOfBirth)}
                    />

                    <DetailItem
                      icon={User}
                      label="Gender"
                      value={
                        selectedCustomer.gender
                          ? selectedCustomer.gender
                              .charAt(0)
                              .toUpperCase() +
                            selectedCustomer.gender.slice(1)
                          : null
                      }
                    />

                    <DetailItem
                      icon={MapPin}
                      label="Address"
                      value={selectedCustomer.address}
                      full
                    />
                  </div>
                </div>

                <div>
                  <SectionTitle>Emergency Contact</SectionTitle>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DetailItem
                      icon={User}
                      label="Name"
                      value={selectedCustomer.emergencyContactName}
                    />

                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={selectedCustomer.emergencyContactPhone}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned footer */}
            <div className="flex shrink-0 justify-end border-t border-white/[0.06] bg-[#0e0e11]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedCustomer);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
                >
                  <Edit3 size={16} />
                  Edit Customer
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================
          Deactivate Modal — small, no scroll needed
      ====================================================== */}

      {showDeactivateModal && selectedCustomer && (
        <Modal
          title="Deactivate Customer"
          subtitle="This will remove the customer from the active directory."
          onClose={() => {
            if (!submitting) {
              setShowDeactivateModal(false);
              setSelectedCustomer(null);
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
                        {getCustomerName(selectedCustomer)}
                      </span>
                      . The customer will no longer appear in the
                      active customer directory.
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

            {/* Pinned footer */}
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.06] bg-[#0e0e11]/95 px-5 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedCustomer(null);
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
  const accentStyles = {
    violet: {
      gradient: "from-violet-600/20 to-violet-600/0",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-400",
      iconRing: "ring-violet-500/20"
    },
    cyan: {
      gradient: "from-cyan-600/20 to-cyan-600/0",
      iconBg: "bg-cyan-500/10",
      iconText: "text-cyan-400",
      iconRing: "ring-cyan-500/20"
    },
    fuchsia: {
      gradient: "from-fuchsia-600/20 to-fuchsia-600/0",
      iconBg: "bg-fuchsia-500/10",
      iconText: "text-fuchsia-400",
      iconRing: "ring-fuchsia-500/20"
    },
    amber: {
      gradient: "from-amber-600/20 to-amber-600/0",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-400",
      iconRing: "ring-amber-500/20"
    }
  };

  const style = accentStyles[accent] || accentStyles.violet;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl transition-all hover:border-white/[0.15] hover:bg-white/[0.03]">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${style.gradient} to-transparent blur-2xl transition-opacity group-hover:opacity-100`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-zinc-600">{description}</p>
        </div>

        <div
          className={`rounded-xl p-2.5 ring-1 ring-inset ${style.iconBg} ${style.iconText} ${style.iconRing}`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

// ======================================================
// Avatar
// ======================================================

const Avatar = ({ customer, large = false }) => {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] font-semibold text-violet-300 shadow-inner ${
        large ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm"
      }`}
    >
      {getInitials(customer)}
    </div>
  );
};

// ======================================================
// Gender Badge
// ======================================================

const GenderBadge = ({ gender }) => {
  if (!gender) {
    return <span className="text-sm text-zinc-600">—</span>;
  }

  const styles = {
    male: "border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300",
    female: "border-fuchsia-500/20 bg-fuchsia-500/[0.08] text-fuchsia-300",
    other: "border-amber-500/20 bg-amber-500/[0.08] text-amber-300"
  };

  const style =
    styles[gender?.toLowerCase()] ||
    "border-white/[0.08] bg-white/[0.03] text-zinc-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${style}`}
    >
      {gender}
    </span>
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
  required = false
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}

        {required && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/[0.08] bg-[#111113] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/[0.08]"
      />
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

      <p className="mt-2 text-sm text-zinc-200">
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
// Modal — sticky header + scrollable body + pinned footer
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

        {/* Sticky header */}
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

        {/* Body + footer composed by the caller via children */}
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
          {hasSearch ? <Search size={24} /> : <Users size={24} />}
        </div>
      </div>

      <h3 className="mt-4 font-semibold text-white">
        {hasSearch ? "No customers found" : "No customers yet"}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        {hasSearch
          ? "Try adjusting your search terms."
          : "Create your first customer record to start building your customer directory."}
      </p>

      {!hasSearch && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-xl hover:shadow-violet-600/30"
        >
          <Plus size={16} />
          Add Customer
        </button>
      )}
    </div>
  );
};

export default Customers;
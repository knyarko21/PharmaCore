
// frontend/src/pages/Doctors.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

import api from "../services/api";

const EMPTY_FORM = {
  fullName: "",
  licenseNumber: "",
  specialization: "",
  phone: "",
  email: "",
  facility: "",
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = showInactive
        ? "/doctors?includeInactive=true"
        : "/doctors";

      const response = await api.get(endpoint);
      const result = response?.data?.data;

      setDoctors(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(getErrorMessage(err));
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return doctors;

    return doctors.filter((doctor) =>
      [
        doctor.fullName,
        doctor.licenseNumber,
        doctor.specialization,
        doctor.phone,
        doctor.email,
        doctor.facility,
      ].some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [doctors, search]);

  const activeCount = doctors.filter((doctor) => doctor.isActive).length;
  const inactiveCount = doctors.length - activeCount;

  const openCreateModal = () => {
    setEditingDoctor(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor);
    setForm({
      fullName: doctor.fullName ?? "",
      licenseNumber: doctor.licenseNumber ?? "",
      specialization: doctor.specialization ?? "",
      phone: doctor.phone ?? "",
      email: doctor.email ?? "",
      facility: doctor.facility ?? "",
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingDoctor(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      fullName: form.fullName.trim(),
      licenseNumber: form.licenseNumber.trim(),
      specialization: form.specialization.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      facility: form.facility.trim() || null,
    };

    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, payload);
        setSuccess("Doctor details updated successfully.");
      } else {
        await api.post("/doctors", payload);
        setSuccess("Doctor registered successfully.");
      }

      setModalOpen(false);
      setEditingDoctor(null);
      setForm(EMPTY_FORM);
      await fetchDoctors();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (doctor) => {
    const action = doctor.isActive ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${doctor.fullName}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      if (doctor.isActive) {
        await api.delete(`/doctors/${doctor.id}`);
        setSuccess(`${doctor.fullName} has been deactivated.`);
      } else {
        await api.put(`/doctors/${doctor.id}`, { isActive: true });
        setSuccess(`${doctor.fullName} has been reactivated.`);
      }

      await fetchDoctors();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-[#111116] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

  return (
    <div className="min-h-full space-y-6 pb-8 text-zinc-100">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
            <Stethoscope size={16} />
            <span>Pharmacy management</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Doctors
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Manage registered doctors and keep prescriber information
            available when processing prescriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
        >
          <Plus size={18} />
          Register doctor
        </button>
      </div>

      {/* Feedback messages */}
      {error && !modalOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && !modalOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <Check size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<UserRound size={19} />}
          label="Doctors listed"
          value={doctors.length}
          description="Doctors returned by your current filter"
          iconStyle="bg-violet-500/10 text-violet-300"
        />

        <SummaryCard
          icon={<UserRoundCheck size={19} />}
          label="Active doctors"
          value={activeCount}
          description="Available for prescription selection"
          iconStyle="bg-emerald-500/10 text-emerald-300"
        />

        <SummaryCard
          icon={<UserRoundX size={19} />}
          label="Inactive doctors"
          value={inactiveCount}
          description="Not available for new prescriptions"
          iconStyle="bg-amber-500/10 text-amber-300"
        />
      </div>

      {/* Search and controls */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101014]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, licence, facility..."
              className="w-full rounded-xl border border-white/10 bg-[#0b0b0f] py-3 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500"
              aria-label="Search doctors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInactive((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                showInactive
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              <Activity size={16} />
              {showInactive ? "Showing inactive too" : "Active doctors"}
              <ChevronDown size={15} />
            </button>

            <button
              type="button"
              onClick={fetchDoctors}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-4 font-medium">Doctor</th>
                <th className="px-5 py-4 font-medium">Licence number</th>
                <th className="px-5 py-4 font-medium">Specialization</th>
                <th className="px-5 py-4 font-medium">Contact</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <LoaderCircle
                      size={24}
                      className="mx-auto animate-spin text-violet-400"
                    />
                    <p className="mt-3 text-sm text-zinc-500">
                      Loading doctors...
                    </p>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <Stethoscope
                      size={28}
                      className="mx-auto text-zinc-600"
                    />
                    <p className="mt-3 text-sm font-medium text-zinc-300">
                      No doctors found
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {search
                        ? "Try another search term."
                        : "Register a doctor to make them available for prescriptions."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => (
                  <tr
                    key={doctor.id}
                    className="transition hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-100">
                        {doctor.fullName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {doctor.facility || "Facility not specified"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-300">
                      {doctor.licenseNumber}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-400">
                      {doctor.specialization || "Not specified"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-zinc-300">
                        {doctor.phone || "No phone"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {doctor.email || "No email"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusPill active={doctor.isActive} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(doctor)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-500/40 hover:text-violet-200"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(doctor)}
                          className={`rounded-lg border px-3 py-2 text-xs transition ${
                            doctor.isActive
                              ? "border-rose-500/20 text-rose-300 hover:bg-rose-500/10"
                              : "border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                          }`}
                        >
                          {doctor.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <div className="py-12 text-center">
              <LoaderCircle
                size={24}
                className="mx-auto animate-spin text-violet-400"
              />
              <p className="mt-3 text-sm text-zinc-500">
                Loading doctors...
              </p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-12 text-center">
              <Stethoscope
                size={28}
                className="mx-auto text-zinc-600"
              />
              <p className="mt-3 text-sm text-zinc-300">
                No doctors found
              </p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <article
                key={doctor.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-zinc-100">
                      {doctor.fullName}
                    </h3>
                    <p className="mt-1 break-all text-xs text-zinc-500">
                      Licence: {doctor.licenseNumber}
                    </p>
                  </div>
                  <StatusPill active={doctor.isActive} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Specialization</p>
                    <p className="mt-1 text-zinc-300">
                      {doctor.specialization || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Facility</p>
                    <p className="mt-1 text-zinc-300">
                      {doctor.facility || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Contact</p>
                    <p className="mt-1 break-all text-zinc-300">
                      {doctor.phone || "No phone"}
                    </p>
                    {doctor.email && (
                      <p className="mt-1 break-all text-xs text-zinc-500">
                        {doctor.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(doctor)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300"
                  >
                    <Edit3 size={14} />
                    Edit details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(doctor)}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      doctor.isActive
                        ? "border-rose-500/20 text-rose-300"
                        : "border-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {doctor.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {!loading && filteredDoctors.length > 0 && (
          <div className="border-t border-white/[0.07] px-5 py-3 text-xs text-zinc-500">
            Showing {filteredDoctors.length} of {doctors.length} doctor
            {doctors.length === 1 ? "" : "s"}
          </div>
        )}
      </section>

      {/* Create / edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#141419] shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5 sm:p-6">
              <div>
                <div className="mb-2 inline-flex rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
                  <Stethoscope size={21} />
                </div>
                <h2
                  id="doctor-modal-title"
                  className="text-xl font-bold text-zinc-100"
                >
                  {editingDoctor ? "Edit doctor" : "Register a doctor"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter the doctor's details below. Name and licence number
                  are required.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                {error && (
                  <div className="col-span-full flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <label className="text-sm text-zinc-300">
                  Full name <span className="text-rose-400">*</span>
                  <input
                    className={inputClass}
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Ama Mensah"
                    minLength={2}
                    required
                    autoFocus
                  />
                </label>

                <label className="text-sm text-zinc-300">
                  Licence number <span className="text-rose-400">*</span>
                  <input
                    className={inputClass}
                    name="licenseNumber"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    placeholder="Enter licence number"
                    required
                  />
                </label>

                <label className="text-sm text-zinc-300">
                  Specialization
                  <input
                    className={inputClass}
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    placeholder="e.g. General Practice"
                  />
                </label>

                <label className="text-sm text-zinc-300">
                  Phone number
                  <input
                    className={inputClass}
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </label>

                <label className="text-sm text-zinc-300">
                  Email address
                  <input
                    className={inputClass}
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="doctor@example.com"
                  />
                </label>

                <label className="text-sm text-zinc-300">
                  Facility / hospital
                  <input
                    className={inputClass}
                    name="facility"
                    value={form.facility}
                    onChange={handleChange}
                    placeholder="e.g. Kumasi Central Hospital"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] p-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingDoctor
                      ? "Save changes"
                      : "Register doctor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ icon, label, value, description, iconStyle }) => (
  <div className="rounded-2xl border border-white/[0.08] bg-[#101014] p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">
          {value}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${iconStyle}`}>{icon}</div>
    </div>
    <p className="mt-3 text-xs leading-5 text-zinc-500">{description}</p>
  </div>
);

const StatusPill = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
      active
        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        active ? "bg-emerald-400" : "bg-zinc-500"
      }`}
    />
    {active ? "Active" : "Inactive"}
  </span>
);

export default Doctors;
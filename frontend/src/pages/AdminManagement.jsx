
import { useCallback, useEffect, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";

import api from "../services/api";

// ======================================================
// Helpers
// ======================================================

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Something went wrong. Please try again.";

const formatDate = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getAccountStatus = (admin) => {
  if (admin.isActive) {
    return {
      label: "Active",
      className:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }

  if (!admin.isEmailVerified) {
    return {
      label: "Awaiting verification",
      className:
        "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }

  if (admin.approvalStatus !== "approved") {
    return {
      label: "Not approved",
      className:
        "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }

  return {
    label: "Inactive",
    className:
      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
};

// ======================================================
// Component
// ======================================================

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [updatingAdminId, setUpdatingAdminId] = useState(null);

  const [showInviteForm, setShowInviteForm] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ====================================================
  // Fetch Admin Accounts
  // ====================================================

  const fetchAdmins = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/users/admins");

      const adminList =
        response.data?.admins ||
        response.data?.users ||
        [];

      setAdmins(Array.isArray(adminList) ? adminList : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ====================================================
  // Form Handling
  // ====================================================

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
    });
  };

  // ====================================================
  // Create Admin Invitation
  // ====================================================

  const handleCreateAdmin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      setError("Please complete all fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/users/admins", {
        firstName,
        lastName,
        email,
      });

      setSuccess(
        response.data?.message ||
          "Admin invitation created successfully."
      );

      resetForm();
      setShowInviteForm(false);

      await fetchAdmins(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ====================================================
  // Resend Admin Invitation
  // ====================================================

  const handleResendInvitation = async (admin) => {
    const confirmed = window.confirm(
      `Resend the invitation to ${admin.email}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setUpdatingAdminId(admin.id);

      const response = await api.post(
        `/users/admins/${admin.id}/resend-invitation`
      );

      setSuccess(
        response.data?.message ||
          `Invitation email sent to ${admin.email}.`
      );

      await fetchAdmins(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingAdminId(null);
    }
  };

  // ====================================================
  // Activate / Deactivate Admin
  // ====================================================

  const handleActivationChange = async (admin) => {
    const nextStatus = !admin.isActive;

    const action = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the account for ${admin.firstName} ${admin.lastName}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setUpdatingAdminId(admin.id);

      const response = await api.patch(
        `/users/${admin.id}/activation`,
        {
          isActive: nextStatus,
        }
      );

      setSuccess(
        response.data?.message ||
          `Admin account ${action}d successfully.`
      );

      await fetchAdmins(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingAdminId(null);
    }
  };

  // ====================================================
  // Summary Counts
  // ====================================================

  const totalAdmins = admins.length;

  const activeAdmins = admins.filter(
    (admin) => admin.isActive
  ).length;

  const awaitingVerification = admins.filter(
    (admin) => !admin.isEmailVerified
  ).length;

  const inactiveAdmins = totalAdmins - activeAdmins;

  // ====================================================
  // Render
  // ====================================================

  return (
    <div className="min-h-screen space-y-8 bg-[#08080a] p-4 text-zinc-100 sm:p-6 lg:p-8">

      {/* Header */}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-violet-400">
            <ShieldCheck size={18} />

            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Security & Administration
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Create administrator invitations, monitor account
            verification, and manage administrator access.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchAdmins(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowInviteForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            <Plus size={17} />

            Invite Admin
          </button>
        </div>
      </div>

      {/* Feedback */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-300/70 hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto text-emerald-300/70 hover:text-emerald-200"
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary Cards */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Total Admins
            </span>

            <ShieldCheck className="text-violet-400" size={20} />
          </div>

          <p className="mt-4 text-3xl font-bold tabular-nums">
            {totalAdmins}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Registered administrator accounts
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Active Admins
            </span>

            <UserCheck className="text-emerald-400" size={20} />
          </div>

          <p className="mt-4 text-3xl font-bold tabular-nums">
            {activeAdmins}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Accounts currently enabled
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Inactive Admins
            </span>

            <UserX className="text-zinc-400" size={20} />
          </div>

          <p className="mt-4 text-3xl font-bold tabular-nums">
            {inactiveAdmins}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Accounts not currently enabled
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Awaiting Verification
            </span>

            <Clock className="text-amber-400" size={20} />
          </div>

          <p className="mt-4 text-3xl font-bold tabular-nums">
            {awaitingVerification}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Admins who have not verified email
          </p>
        </div>

      </div>

      {/* Invitation Form */}

      {showInviteForm && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 sm:p-6">

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserPlus className="text-violet-400" size={20} />

                <h2 className="text-lg font-semibold">
                  Invite a New Administrator
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                The invited person will receive an email
                verification link followed by a password setup link.
                Their account remains inactive until you activate it.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                resetForm();
              }}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close invitation form"
            >
              <X size={19} />
            </button>
          </div>

          <form
            onSubmit={handleCreateAdmin}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                First Name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#111114] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Last Name
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter last name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#111114] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@example.com"
                required
                className="w-full rounded-xl border border-white/10 bg-[#111114] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false);
                  resetForm();
                }}
                disabled={submitting}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Accounts */}

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">
              Administrator Accounts
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Manage invitations, verification, and account access.
            </p>
          </div>

          <span className="w-fit rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400">
            {totalAdmins} {totalAdmins === 1 ? "Account" : "Accounts"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3">
            <RefreshCw
              size={24}
              className="animate-spin text-violet-400"
            />

            <p className="text-sm text-zinc-500">
              Loading administrator accounts...
            </p>
          </div>
        ) : admins.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <ShieldCheck size={25} className="text-zinc-500" />
            </div>

            <h3 className="font-semibold text-zinc-200">
              No administrator accounts found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Create an invitation to add another administrator
              to PharmaCore.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="border-b border-white/[0.07] bg-white/[0.025] text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4 font-semibold">
                    Administrator
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Email Verification
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Approval
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Account Status
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Created
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {admins.map((admin) => {
                  const status = getAccountStatus(admin);

                  const canActivate =
                    admin.approvalStatus === "approved" &&
                    admin.isEmailVerified;

                  const canResendInvitation =
                    !admin.isActive &&
                    admin.approvalStatus === "approved";

                  const isUpdating =
                    updatingAdminId === admin.id;

                  return (
                    <tr
                      key={admin.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-300">
                            {admin.firstName?.charAt(0)?.toUpperCase()}
                            {admin.lastName?.charAt(0)?.toUpperCase()}
                          </div>

                          <div>
                            <p className="font-medium text-zinc-200">
                              {admin.firstName} {admin.lastName}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        {admin.isEmailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <CheckCircle2 size={14} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                            <Clock size={14} />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <span className="text-xs capitalize text-zinc-300">
                          {admin.approvalStatus || "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-xs text-zinc-400">
                        {formatDate(admin.createdAt)}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {canResendInvitation && (
                            <button
                              type="button"
                              onClick={() =>
                                handleResendInvitation(admin)
                              }
                              disabled={isUpdating}
                              title="Resend the Admin invitation or password setup email"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isUpdating ? (
                                <RefreshCw
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Mail size={14} />
                              )}

                              Resend Invitation
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleActivationChange(admin)
                            }
                            disabled={
                              isUpdating ||
                              (!admin.isActive && !canActivate)
                            }
                            title={
                              !admin.isActive && !canActivate
                                ? "The Admin must be approved and verify their email before activation."
                                : admin.isActive
                                  ? "Deactivate this Admin"
                                  : "Activate this Admin"
                            }
                            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              admin.isActive
                                ? "border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {isUpdating ? (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            ) : admin.isActive ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}

                            {isUpdating
                              ? "Updating..."
                              : admin.isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Notice */}

      <div className="flex items-start gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-5">
        <ShieldCheck
          size={20}
          className="mt-0.5 shrink-0 text-violet-400"
        />

        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Administrator security policy
          </h3>

          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Only the Super Admin can create administrator invitations
            and activate or deactivate administrator accounts.
            An administrator must verify their email and complete
            password setup before their account can be activated.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AdminManagement;
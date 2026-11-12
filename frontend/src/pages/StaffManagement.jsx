
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

const STAFF_ROLES = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "procurement", label: "Procurement" },
];

const getRoleLabel = (role) => {
  const matchedRole = STAFF_ROLES.find(
    (item) => item.value === role
  );

  return matchedRole?.label || role || "Unknown";
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getStaffStatus = (staff) => {
  if (staff.isActive) {
    return {
      label: "Active",
      className: "border-green-800 bg-green-950/50 text-green-300",
      icon: CheckCircle2,
    };
  }

  if (staff.invitationAcceptedAt) {
    return {
      label: "Accepted — inactive",
      className: "border-amber-800 bg-amber-950/40 text-amber-300",
      icon: Clock,
    };
  }

  if (staff.approvalStatus === "rejected") {
    return {
      label: "Rejected",
      className: "border-red-800 bg-red-950/40 text-red-300",
      icon: AlertCircle,
    };
  }

  if (staff.isEmailVerified) {
    return {
      label: "Verified — inactive",
      className: "border-blue-800 bg-blue-950/40 text-blue-300",
      icon: ShieldCheck,
    };
  }

  return {
    label: "Invitation pending",
    className: "border-gray-700 bg-gray-800 text-gray-300",
    icon: Mail,
  };
};

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [showInviteForm, setShowInviteForm] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "pharmacist",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  const loadStaff = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await api.get("/users/staff");

      setStaff(response.data?.staff || []);
      setError("");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to load staff accounts."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialStaff = async () => {
      try {
        const response = await api.get("/users/staff");

        if (!cancelled) {
          setStaff(response.data?.staff || []);
          setError("");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              requestError,
              "Unable to load staff accounts."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInitialStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetMessages = () => {
    setError("");
    setSuccess("");
    setWarning("");
  };

  const handleInviteStaff = async (event) => {
    event.preventDefault();

    resetMessages();
    setSubmitting(true);

    try {
      const response = await api.post(
        "/users/invitations",
        {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
        }
      );

      const result = response.data;

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        role: "pharmacist",
      });

      setShowInviteForm(false);

      if (result.emailSent) {
        setSuccess(
          result.message ||
            "Staff invitation created and sent successfully."
        );
      } else {
        setWarning(
          result.message ||
            "The account was created, but the invitation email could not be delivered. Please resend the invitation."
        );
      }

      await loadStaff(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to create the staff invitation."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (member) => {
    const confirmed = window.confirm(
      `Resend the invitation email to ${member.email}? The previous invitation link will no longer work.`
    );

    if (!confirmed) return;

    resetMessages();
    setProcessingId(member.id);

    try {
      const response = await api.post(
        `/users/invitations/${member.id}/resend`
      );

      if (response.data?.emailSent) {
        setSuccess(
          response.data.message ||
            `Invitation resent to ${member.email}.`
        );
      } else {
        setWarning(
          response.data?.message ||
            "The invitation email could not be delivered."
        );
      }

      await loadStaff(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to resend the invitation."
        )
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivationChange = async (member) => {
    const nextStatus = !member.isActive;
    const action = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${member.firstName} ${member.lastName}'s account?`
    );

    if (!confirmed) return;

    resetMessages();
    setProcessingId(member.id);

    try {
      const response = await api.patch(
        `/users/${member.id}/activation`,
        {
          isActive: nextStatus,
        }
      );

      setSuccess(
        response.data?.message ||
          `Staff account ${action}d successfully.`
      );

      await loadStaff(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          `Unable to ${action} the staff account.`
        )
      );
    } finally {
      setProcessingId(null);
    }
  };

  const activeCount = staff.filter(
    (member) => member.isActive
  ).length;

  const pendingCount = staff.filter(
    (member) =>
      !member.isActive &&
      !member.invitationAcceptedAt &&
      member.approvalStatus !== "rejected"
  ).length;

  const inactiveCount = staff.filter(
    (member) =>
      !member.isActive &&
      member.invitationAcceptedAt
  ).length;

  const cardClass =
    "rounded-xl border border-[#272b35] bg-[#111318] p-5 shadow-sm";

  const inputClass =
    "w-full rounded-lg border border-[#343a46] bg-[#0b0d12] px-3 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-gray-300";

  return (
    <div className="min-h-full space-y-6 bg-transparent text-gray-100">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-400" />

            <h1 className="text-2xl font-bold text-white">
              Staff Management
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Invite staff members and manage their account access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadStaff(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#343a46] bg-[#151820] px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-[#202530] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              setShowInviteForm((previous) => !previous);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {showInviteForm ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {showInviteForm ? "Close form" : "Invite staff"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-green-900 bg-green-950/40 p-4 text-sm text-green-300"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {warning && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{warning}</p>
        </div>
      )}

      {/* Invitation form */}
      {showInviteForm && (
        <section className={cardClass}>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              Invite a staff member
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              The staff member will receive an email invitation
              to create their password and access PharmaCore.
            </p>
          </div>

          <form
            onSubmit={handleInviteStaff}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className={labelClass}
                >
                  First name
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  maxLength={50}
                  autoComplete="given-name"
                  placeholder="Enter first name"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className={labelClass}
                >
                  Last name
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  maxLength={50}
                  autoComplete="family-name"
                  placeholder="Enter last name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className={labelClass}
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                autoComplete="email"
                placeholder="staff@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className={labelClass}
              >
                Staff role
              </label>

              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className={inputClass}
              >
                {STAFF_ROLES.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                    className="bg-[#111318] text-gray-100"
                  >
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#272b35] pt-4">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                disabled={submitting}
                className="rounded-lg border border-[#343a46] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-[#202530] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}

                {submitting
                  ? "Sending invitation..."
                  : "Send invitation"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">
              Total staff
            </p>
            <UserCheck className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {staff.length}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">
              Active accounts
            </p>
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {activeCount}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">
              Invitations pending
            </p>
            <Mail className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {pendingCount}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-400">
              Accepted — inactive
            </p>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Staff table */}
      <section className="overflow-hidden rounded-xl border border-[#272b35] bg-[#111318] shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#272b35] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Staff accounts
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Manage invitations and account access.
            </p>
          </div>

          <span className="text-sm text-gray-400">
            {staff.length} account{staff.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading staff accounts...
          </div>
        ) : staff.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <UserPlus className="mb-3 h-10 w-10 text-gray-500" />

            <h3 className="text-base font-semibold text-gray-200">
              No staff accounts found
            </h3>

            <p className="mt-1 max-w-md text-sm text-gray-400">
              Invite your first staff member to begin managing
              your pharmacy team.
            </p>

            <button
              type="button"
              onClick={() => setShowInviteForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Invite staff
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#191d26] text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Staff member
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Role
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Invited / created
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#272b35]">
                {staff.map((member) => {
                  const status = getStaffStatus(member);
                  const StatusIcon = status.icon;

                  const isProcessing =
                    processingId === member.id;

                  const canResendInvitation =
                    !member.isActive &&
                    !member.invitationAcceptedAt &&
                    member.approvalStatus === "approved";

                  const canActivate =
                    !member.isActive &&
                    Boolean(member.invitationAcceptedAt) &&
                    member.isEmailVerified &&
                    member.approvalStatus === "approved";

                  return (
                    <tr
                      key={member.id}
                      className="transition hover:bg-[#191d26]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-100">
                          {member.firstName} {member.lastName}
                        </div>

                        <div className="mt-1 text-xs text-gray-400">
                          {member.email}
                        </div>

                        {!member.isEmailVerified && (
                          <div className="mt-1 text-xs text-amber-400">
                            Email not verified
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {getRoleLabel(member.role)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-400">
                        {formatDate(member.createdAt)}

                        {member.invitationAcceptedAt && (
                          <div className="mt-1 text-xs text-green-400">
                            Accepted:{" "}
                            {formatDate(
                              member.invitationAcceptedAt
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canResendInvitation && (
                            <button
                              type="button"
                              onClick={() =>
                                handleResendInvitation(member)
                              }
                              disabled={isProcessing}
                              title="Resend invitation"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-800 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Mail className="h-3.5 w-3.5" />

                              {isProcessing
                                ? "Processing..."
                                : "Resend"}
                            </button>
                          )}

                          {(member.isActive || canActivate) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleActivationChange(member)
                              }
                              disabled={isProcessing}
                              title={
                                member.isActive
                                  ? "Deactivate account"
                                  : "Activate account"
                              }
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                member.isActive
                                  ? "border-red-800 text-red-300 hover:bg-red-950/50"
                                  : "border-green-800 text-green-300 hover:bg-green-950/50"
                              }`}
                            >
                              {member.isActive ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}

                              {isProcessing
                                ? "Processing..."
                                : member.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          )}

                          {!canResendInvitation &&
                            !member.isActive &&
                            !canActivate && (
                              <span className="text-xs text-gray-500">
                                No action available
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Access guidance */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-900/60 bg-blue-950/30 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

        <div>
          <h3 className="text-sm font-semibold text-blue-200">
            Staff account security
          </h3>

          <p className="mt-1 text-sm text-blue-300">
            Staff invitations expire after 24 hours. Once a
            staff member accepts an invitation, their email is
            verified and their account becomes active. You can
            deactivate an active account at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
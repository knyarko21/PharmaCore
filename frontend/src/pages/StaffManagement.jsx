
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
  {
    value: "pharmacist",
    label: "Pharmacist",
  },
  {
    value: "cashier",
    label: "Cashier",
  },
  {
    value: "inventory_manager",
    label: "Inventory Manager",
  },
  {
    value: "procurement",
    label: "Procurement",
  },
];

const getRoleLabel = (role) => {
  const matchedRole = STAFF_ROLES.find(
    (item) => item.value === role
  );

  if (matchedRole) {
    return matchedRole.label;
  }

  return role || "Unknown";
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

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
      className: "bg-green-100 text-green-700",
      icon: CheckCircle2,
    };
  }

  if (staff.invitationAcceptedAt) {
    return {
      label: "Accepted — inactive",
      className: "bg-amber-100 text-amber-700",
      icon: Clock,
    };
  }

  if (staff.approvalStatus === "rejected") {
    return {
      label: "Rejected",
      className: "bg-red-100 text-red-700",
      icon: AlertCircle,
    };
  }

  if (staff.isEmailVerified) {
    return {
      label: "Verified — inactive",
      className: "bg-blue-100 text-blue-700",
      icon: ShieldCheck,
    };
  }

  return {
    label: "Invitation pending",
    className: "bg-gray-100 text-gray-700",
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
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/users/staff");

      setStaff(response.data?.staff || []);
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
    loadStaff();
  }, [loadStaff]);

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

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-600" />

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Staff Management
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Invite staff members and manage their account access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadStaff(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

          <p>{success}</p>
        </div>
      )}

      {warning && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <p>{warning}</p>
        </div>
      )}

      {/* Invitation form */}
      {showInviteForm && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invite a staff member
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Staff role
              </label>

              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-900"
              >
                {STAFF_ROLES.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total staff
            </p>

            <UserCheck className="h-5 w-5 text-blue-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {staff.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Active accounts
            </p>

            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Invitations pending
            </p>

            <Mail className="h-5 w-5 text-amber-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Accepted — inactive
            </p>

            <Clock className="h-5 w-5 text-amber-600" />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Staff table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Staff accounts
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage invitations and account access.
            </p>
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {staff.length} account{staff.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading staff accounts...
          </div>
        ) : staff.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <UserPlus className="mb-3 h-10 w-10 text-gray-400" />

            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              No staff accounts found
            </h3>

            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              Invite your first staff member to begin managing
              your pharmacy team.
            </p>

            <button
              type="button"
              onClick={() => setShowInviteForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Invite staff
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
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

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
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
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.firstName} {member.lastName}
                        </div>

                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {member.email}
                        </div>

                        {!member.isEmailVerified && (
                          <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Email not verified
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                        {getRoleLabel(member.role)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                        {formatDate(member.createdAt)}

                        {member.invitationAcceptedAt && (
                          <div className="mt-1 text-xs text-green-600 dark:text-green-400">
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
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
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
                                  ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                                  : "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-300 dark:hover:bg-green-950/40"
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
                              <span className="text-xs text-gray-400">
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
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

        <div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Staff account security
          </h3>

          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
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
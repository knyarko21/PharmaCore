
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Mail,
  AlertCircle,
  UserCheck,
  LoaderCircle,
} from "lucide-react";

import api from "../services/api";

const STAFF_ROLES = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "procurement", label: "Procurement" },
];

const getRoleLabel = (role) => {
  return (
    STAFF_ROLES.find((item) => item.value === role)?.label ||
    "Not specified"
  );
};

const UserApprovals = () => {
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailWarning, setEmailWarning] = useState("");

  // ==========================================
  // FETCH PENDING REGISTRATIONS
  // ==========================================

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/users?approvalStatus=pending"
      );

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload.message || "Unable to retrieve pending users."
        );
      }

      const pendingUsers = Array.isArray(payload?.users)
        ? payload.users
        : [];

      setUsers(pendingUsers);

      setSelectedRoles((previous) => {
        const updated = { ...previous };

        pendingUsers.forEach((user) => {
          const requestedRole = STAFF_ROLES.some(
            (item) => item.value === user.requestedRole
          )
            ? user.requestedRole
            : "cashier";

          // Default to the applicant's requested role.
          // Preserve any role manually selected by the reviewer.
          if (!updated[user.id]) {
            updated[user.id] = requestedRole;
          }
        });

        return updated;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load pending registrations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // ==========================================
  // CHANGE SELECTED ROLE
  // ==========================================

  const handleRoleChange = (userId, role) => {
    setSelectedRoles((previous) => ({
      ...previous,
      [userId]: role,
    }));
  };

  // ==========================================
  // APPROVE REGISTRATION
  // ==========================================

  const handleApprove = async (user) => {
    const selectedRole = selectedRoles[user.id];

    if (!STAFF_ROLES.some((item) => item.value === selectedRole)) {
      setError("Please select a valid staff role.");
      return;
    }

    if (!user.isEmailVerified) {
      setError(
        "This user's email must be verified before approval."
      );
      return;
    }

    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");
      setEmailWarning("");

      const response = await api.patch(
        `/users/${user.id}/approval`,
        {
          approvalStatus: "approved",
          role: selectedRole,
        }
      );

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload.message || "Unable to approve this user."
        );
      }

      setSuccess(
        `${user.firstName} ${user.lastName} was approved successfully and assigned the ${getRoleLabel(selectedRole)} role.`
      );

      if (payload?.emailSent === false) {
        setEmailWarning(
          "The account was approved, but the approval notification email could not be sent. The account status has not been affected."
        );
      }

      await fetchPendingUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to approve this registration."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // REJECT REGISTRATION
  // ==========================================

  const handleReject = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject the registration for ${user.firstName} ${user.lastName}?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(user.id);
      setError("");
      setSuccess("");
      setEmailWarning("");

      const response = await api.patch(
        `/users/${user.id}/approval`,
        {
          approvalStatus: "rejected",
        }
      );

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload.message || "Unable to reject this user."
        );
      }

      setSuccess(
        `${user.firstName} ${user.lastName}'s registration was rejected successfully.`
      );

      if (payload?.emailSent === false) {
        setEmailWarning(
          "The registration was rejected, but the notification email could not be sent. The rejection has still been recorded."
        );
      }

      await fetchPendingUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to reject this registration."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-GH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-violet-400">
              <ShieldCheck size={17} />
              <span>User Management</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              User Approvals
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Review new registrations, verify email status,
              and assign staff roles.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPendingUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Pending Registrations
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {users.length}
                </p>
              </div>

              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
                <Clock size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Verified Emails
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {users.filter((user) => user.isEmailVerified).length}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <Mail size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Awaiting Email Verification
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {users.filter((user) => !user.isEmailVerified).length}
                </p>
              </div>

              <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400">
                <AlertCircle size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <CheckCircle size={19} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* EMAIL WARNING */}

        {emailWarning && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{emailWarning}</p>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* REGISTRATIONS */}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex flex-col justify-between gap-2 border-b border-slate-800 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Pending User Requests
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Only verified email accounts can be approved.
              </p>
            </div>

            <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              {users.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <LoaderCircle
                size={32}
                className="mb-3 animate-spin text-violet-400"
              />

              <p className="text-sm">
                Loading pending registrations...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 rounded-full bg-emerald-500/10 p-4 text-emerald-400">
                <UserCheck size={30} />
              </div>

              <h3 className="text-lg font-semibold text-white">
                No Pending Registrations
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-400">
                There are currently no user registrations waiting
                for approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {users.map((user) => {
                const isProcessing = processingId === user.id;

                return (
                  <div
                    key={user.id}
                    className="p-5 transition hover:bg-slate-800/30"
                  >
                    <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">

                      {/* USER INFORMATION */}

                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-lg font-bold text-violet-300">
                          {user.firstName?.charAt(0)?.toUpperCase()}
                          {user.lastName?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-white">
                            {user.firstName} {user.lastName}
                          </h3>

                          <p className="mt-1 break-all text-sm text-slate-400">
                            {user.email}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {user.isEmailVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                                <CheckCircle size={13} />
                                Email Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400">
                                <AlertCircle size={13} />
                                Email Not Verified
                              </span>
                            )}

                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                              Pending Approval
                            </span>
                          </div>

                          <div className="mt-3 space-y-1 text-xs">
                            <p className="text-slate-400">
                              Requested role:{" "}
                              <span className="font-semibold text-violet-300">
                                {getRoleLabel(user.requestedRole)}
                              </span>
                            </p>

                            <p className="text-slate-500">
                              Registered: {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ROLE AND ACTIONS */}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 sm:w-52">
                          <label
                            htmlFor={`role-${user.id}`}
                            className="mb-2 block text-xs font-medium text-slate-400"
                          >
                            Assign Staff Role
                          </label>

                          <select
                            id={`role-${user.id}`}
                            value={selectedRoles[user.id] || "cashier"}
                            onChange={(event) =>
                              handleRoleChange(
                                user.id,
                                event.target.value
                              )
                            }
                            disabled={isProcessing}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-500 disabled:opacity-50"
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

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(user)}
                            disabled={
                              isProcessing ||
                              !user.isEmailVerified
                            }
                            title={
                              !user.isEmailVerified
                                ? "Email verification is required"
                                : "Approve registration"
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                          >
                            {isProcessing ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(user)}
                            disabled={isProcessing}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PERMISSION NOTE */}

        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-violet-400"
          />

          <div className="text-xs leading-6 text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">
                Approval permissions:
              </span>{" "}
              Admin and Super Admin accounts can approve or reject
              ordinary staff registrations and assign staff roles.
            </p>

            <p className="mt-1">
              Only Super Admin accounts can activate or deactivate
              accounts through account management. Email verification
              is mandatory before approval, and all approval actions
              are recorded in the audit log.
            </p>

            <p className="mt-1">
              The Super Admin receives notifications when new staff
              applicants verify their email addresses.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserApprovals;
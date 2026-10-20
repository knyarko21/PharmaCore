
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";

import api from "../services/api";

const STAFF_ROLES = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "cashier", label: "Cashier" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "procurement", label: "Procurement" },
];

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const getUsersFromResponse = (response) => {
  const data = getResponseData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data?.users)) return data.data.users;

  return [];
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getFullName = (user) =>
  [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ") || "Unnamed applicant";

const UserApprovals = () => {
  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPendingUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users", {
        params: { approvalStatus: "pending" },
      });

      const pendingUsers = getUsersFromResponse(response).filter(
        (user) => user.approvalStatus === "pending"
      );

      setUsers(pendingUsers);

      setSelectedRoles((previous) => {
        const next = { ...previous };

        pendingUsers.forEach((user) => {
          if (!next[user.id]) {
            const existingRole = STAFF_ROLES.some(
              (role) => role.value === user.role
            )
              ? user.role
              : "cashier";

            next[user.id] = existingRole;
          }
        });

        return next;
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load pending registrations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  const handleRoleChange = (userId, role) => {
    setSelectedRoles((previous) => ({
      ...previous,
      [userId]: role,
    }));
  };

  const handleReview = async (user, status) => {
    const action = status === "approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the registration for ${getFullName(user)}?`
    );

    if (!confirmed) return;

    setProcessingId(user.id);
    setError("");
    setNotice("");

    try {
      const payload =
        status === "approved"
          ? {
              status: "approved",
              role: selectedRoles[user.id] || "cashier",
            }
          : {
              status: "rejected",
            };

      await api.patch(`/users/${user.id}/approval`, payload);

      setUsers((previous) =>
        previous.filter((item) => item.id !== user.id)
      );

      setNotice(
        status === "approved"
          ? `${getFullName(user)} has been approved successfully.`
          : `The registration for ${getFullName(user)} has been rejected.`
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          `Unable to ${action} this registration. Please try again.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#08080a] p-4 text-zinc-100 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
            <ShieldCheck size={16} />
            Administration
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            User Approvals
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Review new staff registrations, assign roles, and control who
            can access PharmaCore.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPendingUsers}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Pending registrations
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums">
                {users.length}
              </p>
            </div>

            <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Available staff roles
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums">
                {STAFF_ROLES.length}
              </p>
            </div>

            <div className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 text-sm text-red-300"
        >
          <XCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-sm text-emerald-300"
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      {/* Pending registrations */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <h2 className="font-semibold">Registration requests</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Assign the appropriate role before approving an applicant.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8">
            <LoaderCircle
              size={30}
              className="animate-spin text-violet-400"
            />
            <p className="text-sm text-zinc-400">
              Loading registration requests...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UserCheck size={30} className="text-zinc-400" />
            </div>

            <h3 className="mt-4 font-semibold">
              No pending registrations
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
              New staff requests will appear here when applicants
              complete the registration form.
            </p>

            <button
              type="button"
              onClick={loadPendingUsers}
              className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/10"
            >
              <RefreshCw size={15} />
              Check again
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {users.map((user) => {
              const isProcessing = processingId === user.id;

              return (
                <article
                  key={user.id}
                  className="p-5 transition hover:bg-white/[0.015] sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-lg font-semibold text-violet-200">
                        {getFullName(user).charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-zinc-100">
                          {getFullName(user)}
                        </h3>

                        <p className="mt-1 break-all text-sm text-zinc-400">
                          {user.email}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1 text-amber-300">
                            Pending review
                          </span>

                          <span>
                            Registered {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:max-w-md">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        Assign staff role
                      </label>

                      <select
                        value={selectedRoles[user.id] || "cashier"}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value)
                        }
                        disabled={isProcessing}
                        className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500 disabled:opacity-50"
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

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleReview(user, "approved")
                          }
                          disabled={isProcessing}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleReview(user, "rejected")
                          }
                          disabled={isProcessing}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserX size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-zinc-500">
        Security note: public registration cannot assign administrator
        privileges. Only an authorized administrator should approve
        accounts and assign staff roles.
      </p>
    </div>
  );
};

export default UserApprovals;
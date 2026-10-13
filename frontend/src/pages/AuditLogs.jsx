
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

// ======================================================
// Constants
// ======================================================

const PAGE_SIZE = 12;

const ACTION_TYPES = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "SALE", label: "Sale" },
  { value: "RESTOCK", label: "Restock" },
];

const ACTOR_TYPES = [
  { value: "admin", label: "Administrator" },
  { value: "staff", label: "Staff" },
  { value: "pharmacist", label: "Pharmacist" },
];

// ======================================================
// Formatting Helpers
// ======================================================

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name) => {
  if (!name || typeof name !== "string") {
    return "SY";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "SY";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getActionColor = (actionType) => {
  const action = String(actionType || "").toUpperCase();

  const styles = {
    CREATE:
      "border-emerald-500/20 bg-[#10251b] text-emerald-400",

    UPDATE:
      "border-violet-500/20 bg-[#20162e] text-violet-300",

    DELETE:
      "border-rose-500/20 bg-[#2a1519] text-rose-400",

    LOGIN:
      "border-sky-500/20 bg-[#12212c] text-sky-300",

    LOGOUT:
      "border-amber-500/20 bg-[#2a2113] text-amber-300",

    RESTOCK:
      "border-cyan-500/20 bg-[#10262a] text-cyan-300",

    SALE:
      "border-fuchsia-500/20 bg-[#29152b] text-fuchsia-300",
  };

  return (
    styles[action] ||
    "border-[#34343e] bg-[#1a1a21] text-zinc-300"
  );
};

const getActorName = (log) => {
  const actor = log?.actor;

  return (
    log?.actorName ||
    (typeof actor === "string" ? actor : null) ||
    log?.user?.name ||
    log?.user?.fullName ||
    log?.user?.email ||
    "Unknown actor"
  );
};

const getActorRole = (log) => {
  return String(
    log?.role ||
      log?.user?.role ||
      "System User"
  );
};

const getActionType = (log) => {
  return String(
    log?.actionType ||
      log?.action ||
      log?.type ||
      "ACTIVITY"
  ).toUpperCase();
};

const getLogDetails = (log) => {
  const description =
    log?.details ||
    log?.description ||
    log?.module ||
    "No details provided.";

  return String(description);
};

const getLogDate = (log) => {
  return log?.createdAt || log?.timestamp || null;
};

const getLogId = (log, index) => {
  return (
    log?.id ??
    log?._id ??
    `${getActionType(log)}-${getLogDate(log) || "unknown"}-${index}`
  );
};

const normalizeRole = (role) => {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    administrator: "admin",
    admin: "admin",
    staff: "staff",
    pharmacist: "pharmacist",
    inventory_manager: "inventory_manager",
  };

  return aliases[normalized] || normalized;
};

// ======================================================
// Small Reusable Components
// ======================================================

const IconBox = ({
  children,
  className = "",
}) => (
  <div
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#30303a] bg-[#191920] text-violet-400 ${className}`}
  >
    {children}
  </div>
);

const LoadingState = ({ refreshing = false }) => (
  <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-[#292932] bg-[#111116] px-4 py-12 text-center">
    <IconBox className="h-14 w-14">
      <Loader2 size={25} className="animate-spin" />
    </IconBox>

    <div>
      <p className="text-sm font-semibold text-white">
        {refreshing
          ? "Refreshing audit logs"
          : "Loading audit logs"}
      </p>

      <p className="mt-2 text-sm leading-5 text-zinc-500">
        Preparing your latest system activity.
      </p>
    </div>
  </div>
);

const ErrorMessage = ({
  message,
  onRetry,
  refreshing,
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-500/20 bg-[#201114] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-[#2a1519] text-rose-400">
          <AlertTriangle size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-300">
            Unable to load audit logs
          </p>

          <p className="mt-1 break-words text-sm leading-6 text-rose-200/80">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            disabled={refreshing}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-500/20 bg-[#30171c] px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-[#3a1a21] focus:outline-none focus:ring-2 focus:ring-rose-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({
  hasFilters,
  onClear,
}) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center px-5 py-12 text-center">
    <IconBox className="h-14 w-14">
      <ShieldCheck size={25} />
    </IconBox>

    <h3 className="mt-4 text-base font-semibold text-white">
      No audit logs found
    </h3>

    <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
      {hasFilters
        ? "No activity matches your current filters. Try changing your search or clearing the filters."
        : "System activity will appear here when audit events are recorded."}
    </p>

    {hasFilters && (
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#34343e] bg-[#191920] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-[#22222a] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      >
        <X size={15} />
        Clear filters
      </button>
    )}
  </div>
);

// ======================================================
// Audit Log Row
// ======================================================

const AuditLogRow = ({ log }) => {
  const actorName = getActorName(log);
  const actionType = getActionType(log);
  const details = getLogDetails(log);
  const date = getLogDate(log);
  const role = getActorRole(log);

  const changeValue = log?.changeValue;

  return (
    <tr className="bg-[#111116] hover:bg-[#17171e]">
      {/* Actor */}
      <td className="px-4 py-4">
        <div className="flex min-w-[170px] items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-[#211632] text-xs font-bold text-violet-300">
            {getInitials(actorName)}
          </div>

          <div className="min-w-0">
            <p className="max-w-[180px] truncate text-sm font-medium text-white">
              {actorName}
            </p>

            <p className="mt-1 text-xs capitalize text-zinc-500">
              {role.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10px] font-bold tracking-wide ${getActionColor(actionType)}`}
        >
          {actionType}
        </span>
      </td>

      {/* Details */}
      <td className="px-4 py-4">
        <p className="max-w-[360px] whitespace-normal break-words text-sm leading-6 text-zinc-300">
          {details}
        </p>

        {log?.module && (
          <p className="mt-1 text-xs capitalize text-zinc-500">
            Module: {String(log.module).replace(/_/g, " ")}
          </p>
        )}
      </td>

      {/* Timestamp */}
      <td className="px-4 py-4">
        <div className="flex min-w-[175px] items-start gap-2 text-xs leading-5 text-zinc-400">
          <Calendar
            size={14}
            className="mt-0.5 shrink-0 text-zinc-500"
          />

          <span>{formatDateTime(date)}</span>
        </div>
      </td>

      {/* Change */}
      <td className="px-4 py-4">
        {typeof changeValue === "number" &&
        Number.isFinite(changeValue) ? (
          <span
            className={`whitespace-nowrap text-sm font-semibold ${
              changeValue > 0
                ? "text-emerald-400"
                : changeValue < 0
                  ? "text-rose-400"
                  : "text-zinc-400"
            }`}
          >
            {changeValue > 0 ? "+" : ""}
            {changeValue}
          </span>
        ) : (
          <span className="text-sm text-zinc-500">—</span>
        )}
      </td>
    </tr>
  );
};

// ======================================================
// Audit Logs Page
// ======================================================

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Draft filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedActor, setSelectedActor] = useState("");

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedType, setAppliedType] = useState("");
  const [appliedActor, setAppliedActor] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  // ====================================================
  // Fetch Audit Logs
  // ====================================================

  const fetchAuditLogs = useCallback(
    async ({
      nextPage = 1,
      isRefresh = false,
    } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        // Only send filters the current backend supports.
        // Search and role filters are applied client-side below.
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
        });

        const response = await api.get(
          `/audit-logs?${params.toString()}`
        );

        const payload = response?.data || {};

        // The controller returns { success, results }.
        const results = payload.results || payload;

        const receivedLogs = Array.isArray(results.logs)
          ? results.logs
          : [];

        const pagination = results.pagination || {};

        const receivedPage = Number(
          pagination.page ?? nextPage
        );

        const receivedTotalPages = Number(
          pagination.totalPages ?? 1
        );

        const receivedTotal = Number(
          pagination.total ?? receivedLogs.length
        );

        setLogs(receivedLogs);

        setPage(
          Number.isFinite(receivedPage) &&
          receivedPage > 0
            ? receivedPage
            : nextPage
        );

        setTotalPages(
          Number.isFinite(receivedTotalPages) &&
          receivedTotalPages > 0
            ? receivedTotalPages
            : 1
        );

        setTotalRecords(
          Number.isFinite(receivedTotal) &&
          receivedTotal >= 0
            ? receivedTotal
            : receivedLogs.length
        );
      } catch (err) {
        console.error(
          "Failed to fetch audit logs:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load audit logs. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ====================================================
  // Load Data When Page Changes
  // ====================================================

  useEffect(() => {
    fetchAuditLogs({ nextPage: page });
  }, [page, fetchAuditLogs]);

  // ====================================================
  // Apply Filters
  // ====================================================

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(search.trim());
    setAppliedType(selectedType);
    setAppliedActor(selectedActor);
    setPage(1);
  }, [search, selectedType, selectedActor]);

  // ====================================================
  // Refresh
  // ====================================================

  const handleRefresh = useCallback(() => {
    fetchAuditLogs({
      nextPage: page,
      isRefresh: true,
    });
  }, [fetchAuditLogs, page]);

  // ====================================================
  // Clear Filters
  // ====================================================

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedType("");
    setSelectedActor("");

    setAppliedSearch("");
    setAppliedType("");
    setAppliedActor("");

    setPage(1);
    setShowFilters(false);
  }, []);

  // ====================================================
  // Filter Current Page
  // ====================================================

  const filteredLogs = useMemo(() => {
    const query = appliedSearch.toLowerCase().trim();

    return logs.filter((log) => {
      const action = getActionType(log);
      const actorName = getActorName(log);
      const actorRole = normalizeRole(getActorRole(log));

      const description = getLogDetails(log);
      const moduleName = String(log?.module || "");

      const matchesSearch =
        !query ||
        [
          actorName,
          action,
          description,
          moduleName,
          log?.user?.email || "",
          log?.entityType || "",
          log?.entityId ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesType =
        !appliedType ||
        action === appliedType.toUpperCase();

      const matchesActor =
        !appliedActor ||
        actorRole === normalizeRole(appliedActor);

      return (
        matchesSearch &&
        matchesType &&
        matchesActor
      );
    });
  }, [
    logs,
    appliedSearch,
    appliedType,
    appliedActor,
  ]);

  const hasFilters = Boolean(
    search.trim() ||
      selectedType ||
      selectedActor ||
      appliedSearch ||
      appliedType ||
      appliedActor
  );

  // ====================================================
  // Loading State
  // ====================================================

  if (loading) {
    return (
      <div className="min-h-full bg-[#08080a] p-4 text-zinc-100 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <LoadingState />
        </div>
      </div>
    );
  }

  // ====================================================
  // Main Page
  // ====================================================

  return (
    <div className="min-h-full bg-[#08080a] text-zinc-100">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-400 sm:tracking-[0.16em]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-violet-500/20 bg-[#211632]">
                <ShieldCheck size={13} />
              </span>

              Security & Activity
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Audit Logs
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Review system activity, user actions, and
              important changes across PharmaCore.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() =>
                setShowFilters((current) => !current)
              }
              aria-expanded={showFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#30303a] bg-[#15151b] px-3 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-500/40 hover:bg-[#1b1923] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <Filter size={16} />
              Filters

              <ChevronDown
                size={15}
                className={
                  showFilters ? "rotate-180" : ""
                }
              />
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#08080a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Error */}
        <ErrorMessage
          message={error}
          onRetry={handleRefresh}
          refreshing={refreshing}
        />

        {/* Filters */}
        {showFilters && (
          <section className="rounded-2xl border border-[#292932] bg-[#111116] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Filter activity
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Search the loaded page by keyword, action, or user role.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#30303a] bg-[#191920] text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Search */}
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Search
                </span>

                <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#34343e] bg-[#0c0c10] px-3 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/10">
                  <Search
                    size={16}
                    className="shrink-0 text-zinc-500"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleApplyFilters();
                      }
                    }}
                    placeholder="Actor, action, details..."
                    className="w-full min-w-0 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
              </label>

              {/* Action */}
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Action type
                </span>

                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(event) =>
                      setSelectedType(event.target.value)
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-[#34343e] bg-[#0c0c10] px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                  >
                    <option value="">All actions</option>

                    {ACTION_TYPES.map((action) => (
                      <option
                        key={action.value}
                        value={action.value}
                        className="bg-[#111116]"
                      >
                        {action.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-3.5 text-zinc-500"
                  />
                </div>
              </label>

              {/* Role */}
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  User role
                </span>

                <div className="relative">
                  <select
                    value={selectedActor}
                    onChange={(event) =>
                      setSelectedActor(event.target.value)
                    }
                    className="min-h-11 w-full appearance-none rounded-xl border border-[#34343e] bg-[#0c0c10] px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
                  >
                    <option value="">All users</option>

                    {ACTOR_TYPES.map((actor) => (
                      <option
                        key={actor.value}
                        value={actor.value}
                        className="bg-[#111116]"
                      >
                        {actor.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-3.5 text-zinc-500"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#292932] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-zinc-500">
                Filters apply to the records on the current page.
              </p>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#34343e] bg-[#191920] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-[#22222a] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <X size={15} />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <Filter size={15} />
                  Apply filters
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Results Summary */}
        <section className="flex flex-col gap-3 rounded-2xl border border-[#292932] bg-[#111116] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <IconBox>
              <Activity size={18} />
            </IconBox>

            <div>
              <p className="text-sm font-semibold text-white">
                System activity
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {filteredLogs.length} matching log
                {filteredLogs.length === 1 ? "" : "s"} on this page
                {" · "}
                {totalRecords} total records
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {appliedType && (
              <span className="rounded-lg border border-violet-500/20 bg-[#20162e] px-2.5 py-1.5 text-violet-300">
                {appliedType}
              </span>
            )}

            {appliedActor && (
              <span className="rounded-lg border border-[#34343e] bg-[#1a1a21] px-2.5 py-1.5 capitalize">
                {appliedActor.replace(/_/g, " ")}
              </span>
            )}

            {appliedSearch && (
              <span className="max-w-full break-all rounded-lg border border-[#34343e] bg-[#1a1a21] px-2.5 py-1.5">
                Search: {appliedSearch}
              </span>
            )}

            {!hasFilters && (
              <span className="rounded-lg border border-[#30303a] bg-[#191920] px-2.5 py-1.5">
                All activity
              </span>
            )}
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-[#292932] bg-[#111116]">
          <div className="flex flex-col gap-2 border-b border-[#292932] bg-[#15151b] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Activity records
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Recorded user and system events
              </p>
            </div>

            {refreshing && (
              <span className="inline-flex items-center gap-2 text-xs text-violet-300">
                <Loader2 size={14} className="animate-spin" />
                Updating records...
              </span>
            )}
          </div>

          {refreshing && (
            <div className="px-4 py-2">
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#292932]">
                <div className="h-full w-1/3 rounded-full bg-violet-500" />
              </div>
            </div>
          )}

          {filteredLogs.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onClear={resetFilters}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#292932] bg-[#18181f]">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Actor
                    </th>

                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Action
                    </th>

                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Details
                    </th>

                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Time
                    </th>

                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      Change
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#25252d]">
                  {filteredLogs.map((log, index) => (
                    <AuditLogRow
                      key={getLogId(log, index)}
                      log={log}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pagination */}
        <footer className="flex flex-col gap-4 rounded-2xl border border-[#292932] bg-[#111116] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Activity
              size={16}
              className="text-violet-400"
            />

            <span>
              Page{" "}
              <span className="font-semibold text-white">
                {page}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white">
                {totalPages}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#34343e] bg-[#191920] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-[#22222a] focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={15} />
              Previous
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages || refreshing
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#34343e] bg-[#191920] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-[#22222a] focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ArrowRight size={15} />
            </button>
          </div>
        </footer>

        {/* Footer */}
        <div className="border-t border-[#25252d] pt-4 text-xs leading-5 text-zinc-500">
          Audit logs help administrators review recorded system
          activity. Access and retention depend on your backend
          permissions and audit-log configuration.
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
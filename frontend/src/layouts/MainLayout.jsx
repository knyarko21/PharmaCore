
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageX,
  Pill,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ======================================================
// Navigation
// ======================================================

const navigation = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Medicines", path: "/medicines", icon: Pill },
  { label: "Inventory", path: "/inventory", icon: Boxes },
  { label: "Purchases", path: "/purchases", icon: Truck },
  { label: "Suppliers", path: "/suppliers", icon: Building2 },
  { label: "Sales", path: "/sales", icon: ShoppingCart },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Prescriptions", path: "/prescriptions", icon: FileText },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
];

// ======================================================
// General Helpers
// ======================================================

const getMedicineName = (item) =>
  item?.medicine?.name ||
  item?.Medicine?.name ||
  item?.batch?.medicine?.name ||
  item?.batch?.Medicine?.name ||
  item?.medicineName ||
  item?.name ||
  "Medicine";

const getExpiryDate = (item) =>
  item?.expiryDate ||
  item?.expiry_date ||
  item?.expiry ||
  item?.batch?.expiryDate ||
  item?.batch?.expiry_date ||
  null;

const getBatchNumber = (item) =>
  item?.batchNumber ||
  item?.batch_number ||
  item?.batch?.batchNumber ||
  item?.batch?.batch_number ||
  null;

const getQuantity = (item) =>
  item?.currentStock ??
  item?.current_stock ??
  item?.quantity ??
  item?.stock ??
  item?.availableQuantity ??
  item?.availableStock ??
  item?.batch?.quantity ??
  null;

const getResponseItems = (response, keys = []) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const formatDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return "Your session may have expired. Please log in again.";
  }

  if (error?.response?.status === 403) {
    return "Your account does not have permission to view inventory alerts.";
  }

  if (!error?.response) {
    return "Cannot reach the backend. Check that your PharmaCore server is running.";
  }

  return (
    error?.response?.data?.message ||
    "Unable to load some inventory alerts."
  );
};

const loadReadAlertIds = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load read notification IDs:", error);
    return [];
  }
};

// ======================================================
// Main Layout
// ======================================================

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dark mode is permanent throughout the application.
  const darkMode = true;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertError, setAlertError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const notificationRef = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userIdentifier = user?.id ?? user?.email ?? "guest";

  const storageKey = `pharmacore_read_inventory_alerts_${userIdentifier}`;

  const [readState, setReadState] = useState(() => ({
    key: storageKey,
    ids: loadReadAlertIds(storageKey),
  }));

  // ====================================================
  // Enforce Dark Theme
  // ====================================================

  useLayoutEffect(() => {
    const root = document.documentElement;

    root.classList.add("dark");
    root.dataset.theme = "dark";
    root.style.colorScheme = "dark";

    try {
      localStorage.setItem("pharmacore_theme", "dark");
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, []);

  // ====================================================
  // Notification Persistence
  // ====================================================

  useEffect(() => {
    if (readState.key !== storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(readState.ids));
    } catch (error) {
      console.error("Could not save notification read status:", error);
    }
  }, [readState, storageKey]);

  useEffect(() => {
    setReadState({
      key: storageKey,
      ids: loadReadAlertIds(storageKey),
    });
  }, [storageKey]);

  // ====================================================
  // User Information
  // ====================================================

  const getInitials = useCallback(() => {
    if (!user) return "PC";

    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "PC";
  }, [user]);

  const getFullName = useCallback(() => {
    if (!user) return "PharmaCore User";

    return (
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "PharmaCore User"
    );
  }, [user]);

  const getRoleName = useCallback(() => {
    if (!user?.role) return "User";

    return user.role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [user]);

  // ====================================================
  // Read Notification State
  // ====================================================

  const isAlertRead = useCallback(
    (alertId) => {
      if (readState.key !== storageKey) return false;

      return readState.ids.includes(alertId);
    },
    [readState, storageKey]
  );

  const unreadCount = useMemo(
    () =>
      alerts.reduce(
        (count, alert) => count + (isAlertRead(alert.id) ? 0 : 1),
        0
      ),
    [alerts, isAlertRead]
  );

  const markAsRead = useCallback(
    (alertId) => {
      setReadState((current) => {
        const currentIds =
          current.key === storageKey
            ? current.ids
            : loadReadAlertIds(storageKey);

        if (currentIds.includes(alertId)) {
          return {
            key: storageKey,
            ids: currentIds,
          };
        }

        return {
          key: storageKey,
          ids: [...currentIds, alertId],
        };
      });
    },
    [storageKey]
  );

  const markAllAsRead = useCallback(() => {
    setReadState((current) => {
      const currentIds =
        current.key === storageKey
          ? current.ids
          : loadReadAlertIds(storageKey);

      const combined = new Set(currentIds);

      alerts.forEach((alert) => combined.add(alert.id));

      return {
        key: storageKey,
        ids: Array.from(combined),
      };
    });
  }, [alerts, storageKey]);

  // ====================================================
  // Fetch Inventory Notifications
  // ====================================================

  const fetchInventoryAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setAlertError("");

    try {
      const results = await Promise.allSettled([
        api.get("/inventory/low-stock"),
        api.get("/inventory/expiring?days=90"),
        api.get("/inventory/expired"),
      ]);

      const [lowStockResult, expiringResult, expiredResult] = results;

      const errors = [];
      const nextAlerts = [];

      // Low-stock notifications
      if (lowStockResult.status === "fulfilled") {
        const medicines = getResponseItems(lowStockResult.value, [
          "medicines",
          "items",
          "inventory",
        ]);

        medicines.forEach((medicine, index) => {
          const stock = getQuantity(medicine);

          const reorderLevel =
            medicine?.reorderLevel ??
            medicine?.reorder_level ??
            null;

          let details = "This medicine needs a stock review.";

          if (stock !== null && reorderLevel !== null) {
            details = `Current stock: ${stock}. Reorder level: ${reorderLevel}.`;
          } else if (stock !== null) {
            details = `Current stock: ${stock}.`;
          }

          nextAlerts.push({
            id: `low-${medicine.id ?? medicine.sku ?? index}`,
            type: "low-stock",
            title: "Low stock",
            medicineName: getMedicineName(medicine),
            details,
            priority: 2,
            path: "/inventory",
          });
        });
      } else {
        errors.push(
          `Low-stock alerts: ${getErrorMessage(lowStockResult.reason)}`
        );
      }

      // Expiring batches
      if (expiringResult.status === "fulfilled") {
        const batches = getResponseItems(expiringResult.value, [
          "batches",
          "items",
          "inventory",
        ]);

        batches.forEach((batch, index) => {
          const expiryDate = getExpiryDate(batch);
          const batchNumber = getBatchNumber(batch);
          const quantity = getQuantity(batch);

          const details =
            [
              expiryDate ? `Expires: ${formatDate(expiryDate)}` : null,
              batchNumber ? `Batch: ${batchNumber}` : null,
              quantity !== null ? `Quantity: ${quantity}` : null,
            ]
              .filter(Boolean)
              .join(" · ") ||
            "Review this batch's expiry date.";

          nextAlerts.push({
            id: `expiring-${batch.id ?? batchNumber ?? index}`,
            type: "expiring",
            title: "Expiring medicine",
            medicineName: getMedicineName(batch),
            details,
            priority: 1,
            path: "/inventory",
          });
        });
      } else {
        errors.push(
          `Expiring alerts: ${getErrorMessage(expiringResult.reason)}`
        );
      }

      // Expired batches
      if (expiredResult.status === "fulfilled") {
        const batches = getResponseItems(expiredResult.value, [
          "batches",
          "items",
          "inventory",
        ]);

        batches.forEach((batch, index) => {
          const expiryDate = getExpiryDate(batch);
          const batchNumber = getBatchNumber(batch);
          const quantity = getQuantity(batch);

          const details =
            [
              expiryDate ? `Expired: ${formatDate(expiryDate)}` : null,
              batchNumber ? `Batch: ${batchNumber}` : null,
              quantity !== null ? `Quantity: ${quantity}` : null,
            ]
              .filter(Boolean)
              .join(" · ") ||
            "Review this expired batch immediately.";

          nextAlerts.push({
            id: `expired-${batch.id ?? batchNumber ?? index}`,
            type: "expired",
            title: "Expired stock",
            medicineName: getMedicineName(batch),
            details,
            priority: 0,
            path: "/inventory",
          });
        });
      } else {
        errors.push(
          `Expired alerts: ${getErrorMessage(expiredResult.reason)}`
        );
      }

      // Expired stock appears first, followed by expiring and low-stock items.
      nextAlerts.sort((a, b) => a.priority - b.priority);

      setAlerts(nextAlerts);
      setLastUpdated(new Date());

      if (errors.length > 0) {
        console.warn("Some inventory alerts failed to load:", errors);

        setAlertError(
          "Some alert categories could not be loaded. Try refreshing."
        );
      }
    } catch (error) {
      console.error("Failed to fetch inventory alerts:", error);
      setAlertError(getErrorMessage(error));
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // ====================================================
  // Close Menus Outside the Menu or with Escape
  // ====================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // ====================================================
  // Notification Actions
  // ====================================================

  const toggleNotifications = useCallback(() => {
    const willOpen = !notificationsOpen;

    setNotificationsOpen(willOpen);

    if (willOpen) {
      fetchInventoryAlerts();
    }
  }, [fetchInventoryAlerts, notificationsOpen]);

  const openAlert = useCallback(
    (alert) => {
      markAsRead(alert.id);
      setNotificationsOpen(false);
      navigate(alert.path);
    },
    [markAsRead, navigate]
  );

  const getAlertIcon = (type) => {
    if (type === "expired") return PackageX;
    if (type === "expiring") return CalendarClock;

    return AlertTriangle;
  };

  const getAlertColors = (type) => {
    if (type === "expired") {
      return "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20";
    }

    if (type === "expiring") {
      return "bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20";
    }

    return "bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20";
  };

  // ====================================================
  // Dark Theme Classes
  // ====================================================

  const pageClass =
    "min-h-screen min-h-dvh bg-[#08080a] text-zinc-100";

  const headerClass =
    "border-white/[0.06] bg-[#08080a] text-zinc-100";

  const secondaryTextClass = "text-zinc-500";

  const mutedButtonClass =
    "text-zinc-400 hover:bg-white/[0.06] hover:text-white";

  // ====================================================
  // Render
  // ====================================================

  return (
    <div className={`${pageClass} w-full min-w-0 overflow-x-clip`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } border-white/[0.06] bg-[#0b0b0e] shadow-2xl shadow-black/40`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.06] px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/30">
              <Pill size={22} className="text-white" />

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0b0e]" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">
                PharmaCore
              </h1>

              <p className={`truncate text-xs ${secondaryTextClass}`}>
                Pharmacy Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={`rounded-lg p-2 transition lg:hidden ${mutedButtonClass}`}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-6">
          <p
            className={`mb-3 px-4 text-[11px] font-semibold uppercase tracking-wider ${secondaryTextClass}`}
          >
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/25"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={19} className="shrink-0" />

                    <span className="min-w-0 flex-1">{item.label}</span>

                    {isActive && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-white/[0.06] p-4">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/25"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              }`
            }
          >
            <Settings size={19} className="shrink-0" />

            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={logout}
            className="group mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut
              size={19}
              className="shrink-0 transition-transform group-hover:-translate-x-0.5"
            />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="min-h-screen min-h-dvh w-full min-w-0 lg:pl-72">
        {/* Top header */}
        <header
          className={`sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between gap-2 border-b px-3 sm:h-20 sm:px-6 lg:px-8 ${headerClass}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`shrink-0 rounded-xl p-2.5 transition-colors lg:hidden ${mutedButtonClass}`}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu size={22} />
            </button>

            <div className="hidden min-w-0 sm:block">
              <p className={`text-xs font-medium ${secondaryTextClass}`}>
                Welcome back
              </p>

              <h2 className="truncate text-lg font-semibold">
                Pharmacy Dashboard
              </h2>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Search */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("pharmacore:open-search")
                );
              }}
              className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white md:flex"
              title="Search"
            >
              <Search size={14} />

              <span>Search</span>

              <kbd className="ml-1 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-500">
                Ctrl K
              </kbd>
            </button>

            {/* System status */}
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 lg:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <Activity size={14} />

              <span>System Online</span>
            </div>

            {/* Notifications */}
            <div className="relative shrink-0" ref={notificationRef}>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative rounded-xl p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${mutedButtonClass}`}
                aria-label={`${unreadCount} unread notifications`}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                title="Inventory notifications"
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 px-1 text-[9px] font-bold text-white shadow-lg shadow-red-500/40">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  role="dialog"
                  aria-label="Notifications panel"
                  className="absolute right-0 top-full z-50 mt-3 w-[min(25rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e11] shadow-2xl shadow-black/60 sm:rounded-3xl"
                >
                  {/* Notification header */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <h3 className="font-semibold">Notifications</h3>

                      <p className={`mt-1 text-xs ${secondaryTextClass}`}>
                        {unreadCount} unread · {alerts.length} total
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Mark all notifications as read"
                        title="Mark all as read"
                      >
                        <CheckCheck size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={fetchInventoryAlerts}
                        disabled={loadingAlerts}
                        className={`rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${mutedButtonClass}`}
                        aria-label="Refresh notifications"
                        title="Refresh alerts"
                      >
                        <RefreshCw
                          size={16}
                          className={loadingAlerts ? "animate-spin" : ""}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className={`rounded-lg p-2 transition-colors ${mutedButtonClass}`}
                        aria-label="Close notifications"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Loading state */}
                  {loadingAlerts && alerts.length === 0 && (
                    <div className="px-5 py-10 text-center">
                      <RefreshCw
                        size={24}
                        className="mx-auto animate-spin text-violet-500"
                      />

                      <p className={`mt-3 text-sm ${secondaryTextClass}`}>
                        Checking inventory alerts...
                      </p>
                    </div>
                  )}

                  {/* Error state */}
                  {alertError && (
                    <div className="mx-4 mt-4 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-red-400"
                      />

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-red-400">
                          Alert loading issue
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          {alertError}
                        </p>

                        <button
                          type="button"
                          onClick={fetchInventoryAlerts}
                          className="mt-2 text-xs font-semibold text-violet-400 hover:text-violet-300"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Alert list */}
                  {alerts.length > 0 && (
                    <div className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain">
                      {alerts.map((alert) => {
                        const Icon = getAlertIcon(alert.type);
                        const read = isAlertRead(alert.id);

                        return (
                          <button
                            type="button"
                            key={alert.id}
                            onClick={() => openAlert(alert)}
                            className={`flex w-full items-start gap-3 border-b border-white/[0.04] px-4 py-4 text-left transition-colors sm:px-5 ${
                              read
                                ? "opacity-75 hover:bg-white/[0.03]"
                                : "bg-violet-500/[0.04] hover:bg-white/[0.03]"
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getAlertColors(alert.type)}`}
                            >
                              <Icon size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">
                                  {alert.title}
                                </p>

                                {!read && (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                                )}
                              </div>

                              <p className="mt-1 truncate text-sm text-zinc-400">
                                {alert.medicineName}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                {alert.details}
                              </p>

                              <p
                                className={`mt-2 text-[10px] font-medium uppercase tracking-wider ${secondaryTextClass}`}
                              >
                                {read ? "Read" : "Unread"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingAlerts &&
                    !alertError &&
                    alerts.length === 0 && (
                      <div className="px-6 py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                          <CheckCheck size={26} />
                        </div>

                        <h4 className="mt-4 text-sm font-semibold">
                          You're all caught up
                        </h4>

                        <p
                          className={`mx-auto mt-2 max-w-xs text-sm leading-6 ${secondaryTextClass}`}
                        >
                          No low-stock, expiring, or expired inventory
                          records were returned.
                        </p>
                      </div>
                    )}

                  {/* Notification footer */}
                  <div className="border-t border-white/[0.06] bg-[#0b0b0e] px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-[11px] ${secondaryTextClass}`}>
                        {lastUpdated
                          ? `Updated ${lastUpdated.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Inventory alert center"}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate("/inventory");
                        }}
                        className="shrink-0 text-xs font-semibold text-violet-400 transition-colors hover:text-violet-300"
                      >
                        View inventory
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User profile */}
            <div className="ml-1 hidden min-w-0 items-center gap-3 border-l border-white/[0.06] pl-3 sm:flex sm:pl-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-600/30 ring-1 ring-inset ring-white/[0.08]">
                {getInitials()}
              </div>

              <div className="hidden min-w-0 max-w-40 md:block">
                <p className="truncate text-sm font-medium">
                  {getFullName()}
                </p>

                <p className={`truncate text-xs ${secondaryTextClass}`}>
                  {getRoleName()}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] w-full min-w-0 overflow-x-clip bg-[#08080a] p-4 text-zinc-100 sm:min-h-[calc(100vh-5rem)] sm:min-h-[calc(100dvh-5rem)] sm:p-6 lg:p-8">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
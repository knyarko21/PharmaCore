
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Pill,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  UserPlus,
  Users
} from "lucide-react";

// ======================================================
// Command Registry
// ======================================================
//
// Each command has:
//   id       - unique key
//   label    - what the user sees
//   hint     - optional secondary text (path, category, etc.)
//   icon     - lucide icon component
//   path     - where to navigate
//   group    - section header ("Navigate", "Create", "Manage")
//   keywords - extra search terms so users can find by synonym
// ======================================================

const COMMANDS = [
  // -------- Overview --------
  {
    id: "nav-dashboard",
    label: "Go to Dashboard",
    hint: "/dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    group: "Navigate",
    keywords: ["home", "overview", "stats", "summary"]
  },

  // -------- Catalog --------
  {
    id: "nav-medicines",
    label: "Go to Medicines",
    hint: "/medicines",
    icon: Pill,
    path: "/medicines",
    group: "Navigate",
    keywords: ["catalog", "products", "drugs"]
  },
  {
    id: "nav-inventory",
    label: "Go to Inventory",
    hint: "/inventory",
    icon: Boxes,
    path: "/inventory",
    group: "Navigate",
    keywords: ["stock", "batches", "supply"]
  },

  // -------- Operations --------
  {
    id: "nav-sales",
    label: "Go to Sales",
    hint: "/sales",
    icon: ShoppingCart,
    path: "/sales",
    group: "Navigate",
    keywords: ["pos", "checkout", "transactions", "revenue"]
  },
  {
    id: "nav-purchases",
    label: "Go to Purchases",
    hint: "/purchases",
    icon: Truck,
    path: "/purchases",
    group: "Navigate",
    keywords: ["orders", "suppliers", "procurement"]
  },
  {
    id: "nav-prescriptions",
    label: "Go to Prescriptions",
    hint: "/prescriptions",
    icon: FileText,
    path: "/prescriptions",
    group: "Navigate",
    keywords: ["rx", "dispense", "doctor"]
  },

  // -------- People --------
  {
    id: "nav-customers",
    label: "Go to Customers",
    hint: "/customers",
    icon: Users,
    path: "/customers",
    group: "Navigate",
    keywords: ["patients", "clients", "contacts"]
  },

  // -------- Insights --------
  {
    id: "nav-analytics",
    label: "Go to Analytics",
    hint: "/analytics",
    icon: BarChart3,
    path: "/analytics",
    group: "Navigate",
    keywords: ["reports", "charts", "trends", "insights"]
  },
  {
    id: "nav-audit",
    label: "Go to Audit Logs",
    hint: "/audit-logs",
    icon: ClipboardList,
    path: "/audit-logs",
    group: "Navigate",
    keywords: ["history", "activity", "trail"]
  },
  {
    id: "nav-settings",
    label: "Go to Settings",
    hint: "/settings",
    icon: Settings,
    path: "/settings",
    group: "Navigate",
    keywords: ["preferences", "config", "account"]
  },

  // -------- Create shortcuts --------
  {
    id: "create-medicine",
    label: "Add a new medicine",
    hint: "Opens the medicines catalogue",
    icon: Pill,
    path: "/medicines?action=create",
    group: "Create",
    keywords: ["new", "register", "product"]
  },
  {
    id: "create-purchase",
    label: "Create a new purchase",
    hint: "Start a purchase order",
    icon: Truck,
    path: "/purchases/create",
    group: "Create",
    keywords: ["order", "supplier", "procurement"]
  },
  {
    id: "create-sale",
    label: "Start a new sale",
    hint: "Open the point of sale",
    icon: ShoppingCart,
    path: "/sales",
    group: "Create",
    keywords: ["pos", "checkout", "sell"]
  },
  {
    id: "create-customer",
    label: "Register a new customer",
    hint: "Add a customer record",
    icon: UserPlus,
    path: "/customers?action=create",
    group: "Create",
    keywords: ["patient", "client", "new"]
  },
  {
    id: "create-prescription",
    label: "Create a new prescription",
    hint: "Dispense against a doctor's order",
    icon: FileText,
    path: "/prescriptions?action=create",
    group: "Create",
    keywords: ["rx", "dispense", "new"]
  }
];

// ======================================================
// Command Palette
// ======================================================

const CommandPalette = () => {
  const navigate = useNavigate();

  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // --------------------------------------------------
  // Filtering
  // --------------------------------------------------

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) return COMMANDS;

    return COMMANDS.filter((command) => {
      const haystack = [
        command.label,
        command.hint,
        command.group,
        ...(command.keywords || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(trimmed);
    });
  }, [query]);

  // --------------------------------------------------
  // Group the filtered commands by their group field.
  // Preserves order of first appearance.
  // --------------------------------------------------

  const grouped = useMemo(() => {
    const map = new Map();

    filtered.forEach((command) => {
      if (!map.has(command.group)) {
        map.set(command.group, []);
      }

      map.get(command.group).push(command);
    });

    return Array.from(map.entries()).map(([group, items]) => ({
      group,
      items
    }));
  }, [filtered]);

  // --------------------------------------------------
  // Flatten for keyboard navigation. Must match the
  // order rendered in the JSX below.
  // --------------------------------------------------

  const flatList = useMemo(
    () => grouped.flatMap((section) => section.items),
    [grouped]
  );

  // --------------------------------------------------
  // Reset active index when query changes
  // Deferred to next frame to avoid synchronous setState within effect
  // --------------------------------------------------

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setActiveIndex(0);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [query]);

  // --------------------------------------------------
  // Global keyboard shortcut and navigation
  // --------------------------------------------------

  useEffect(() => {
    const handler = (event) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (isShortcut) {
        event.preventDefault();
        setOpen((current) => !current);
        setQuery("");
        setActiveIndex(0);
        return;
      }

      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) =>
          Math.min(i + 1, flatList.length - 1)
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const command = flatList[activeIndex];

        if (command) {
          navigate(command.path);
          setOpen(false);
          setQuery("");
        }
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [open, flatList, activeIndex, navigate]);

  // --------------------------------------------------
  // Autofocus when opened
  // --------------------------------------------------

  useEffect(() => {
    if (open) {
      // Defer so the element is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 p-4 pt-[12vh] backdrop-blur-md sm:pt-[15vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0e11]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top gradient hairline */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <Search size={18} className="shrink-0 text-zinc-500" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />

          <kbd className="hidden shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto p-2">
          {flatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] text-zinc-600">
                <Search size={22} />
              </div>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                No matching commands
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Try a different keyword.
              </p>
            </div>
          ) : (
            grouped.map((section) => (
              <div key={section.group} className="mb-1 last:mb-0">
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {section.group}
                </p>

                {section.items.map((command) => {
                  const Icon = command.icon;
                  const globalIndex = flatList.indexOf(command);
                  const active = globalIndex === activeIndex;

                  return (
                    <button
                      key={command.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={() => {
                        navigate(command.path);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                        active
                          ? "bg-gradient-to-r from-violet-500/[0.14] to-transparent text-white"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                          active
                            ? "bg-violet-500/10 text-violet-300 ring-violet-500/20"
                            : "bg-white/[0.03] text-zinc-500 ring-white/[0.04]"
                        }`}
                      >
                        <Icon size={16} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {command.label}
                        </span>

                        {command.hint && (
                          <span className="mt-0.5 block truncate text-[11px] text-zinc-600">
                            {command.hint}
                          </span>
                        )}
                      </span>

                      {active && (
                        <kbd className="hidden shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/30 px-5 py-3">
          <div className="flex items-center gap-4 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5">↓</kbd>
              Navigate
            </span>

            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5">↵</kbd>
              Select
            </span>

            <span className="hidden items-center gap-1.5 sm:flex">
              <kbd className="rounded bg-white/[0.04] px-1.5 py-0.5">ESC</kbd>
              Close
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <Package size={12} />
            PharmaCore
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

import { useEffect, useState } from "react";

import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Sparkles
} from "lucide-react";

import api from "../services/api";

// ======================================================
// Icon Box
// ======================================================

const IconBox = ({ children, className = "", size = "md" }) => {
  const dimensions =
    size === "sm"
      ? "h-9 w-9 rounded-xl"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
};

// ======================================================
// Defaults
// ======================================================

const initialSettings = {
  pharmacyName: "PharmaCore Pharmacy",
  email: "",
  phone: "",
  address: "",
  lowStockAlerts: true,
  expiryAlerts: true,
  purchaseAlerts: false,
  currency: "GHS",
  dateFormat: "DD/MM/YYYY",
  theme: "Dark"
};

const normalizeSettings = (data = {}) => ({
  ...initialSettings,
  ...data,
  email: data.email ?? "",
  phone: data.phone ?? "",
  address: data.address ?? ""
});

// ======================================================
// Reusable Toggle Component
// Declared outside Settings to preserve component identity
// ======================================================

const Toggle = ({
  name,
  label,
  description,
  checked,
  onChange,
  disabled
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-5 transition last:border-0">
    <div>
      <p className="font-medium text-zinc-100">{label}</p>

      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>

    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(name, !checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/30"
          : "bg-white/[0.08]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  </div>
);

// ======================================================
// Reusable Input Component
// Declared outside Settings to preserve component identity
// ======================================================

const Field = ({
  label,
  name,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  disabled
}) => (
  <div>
    <label
      htmlFor={name}
      className="mb-2 block text-sm font-medium text-zinc-300"
    >
      {label}
    </label>

    <div className="relative">
      {Icon && (
        <Icon
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors peer-focus:text-violet-400"
        />
      )}

      <input
        id={name}
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`peer w-full rounded-xl border border-white/[0.08] bg-black/40 py-3 pr-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50 ${
          Icon ? "pl-10" : "pl-4"
        }`}
      />
    </div>
  </div>
);

// ======================================================
// Settings
// ======================================================

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ==================================
  // Load Settings From The Backend
  // ==================================

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        setError("");

        const response = await api.get("/settings");

        if (cancelled) return;

        const data = normalizeSettings(response.data.settings);

        setSettings(data);
        setSavedSettings(data);
      } catch (err) {
        if (cancelled) return;

        console.error("Fetch settings error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load settings. Please check your connection and try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==================================
  // Update A Setting In The Form
  // ==================================

  const updateSetting = (name, value) => {
    setSettings((current) => ({
      ...current,
      [name]: value
    }));

    setSaved(false);
    setError("");
    setMessage("");
  };

  // ==================================
  // Reset Unsaved Changes
  // ==================================

  const resetSettings = () => {
    setSettings({ ...savedSettings });
    setSaved(false);
    setError("");
    setMessage("Unsaved changes have been reset.");
  };

  // ==================================
  // Save Settings To MySQL
  // ==================================

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError("");
      setMessage("");

      const response = await api.put("/settings", settings);

      const data = normalizeSettings(response.data.settings);

      setSettings(data);
      setSavedSettings(data);
      setSaved(true);
      setMessage("Your settings have been saved successfully.");
    } catch (err) {
      console.error("Save settings error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    {
      id: "general",
      label: "General",
      icon: Building2
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell
    },
    {
      id: "security",
      label: "Security",
      icon: ShieldCheck
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: SlidersHorizontal
    }
  ];

  // ==================================
  // Loading State
  // ==================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] to-fuchsia-500/[0.06] shadow-lg shadow-violet-500/10">
            <LoaderCircle
              size={28}
              className="animate-spin text-violet-400"
            />

            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400/70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-emerald-400" />
          </div>

          <div className="text-center">
            <p className="font-semibold text-white">
              Loading your settings
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Connecting to PharmaCore...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================================
  // Main Settings Interface
  // ==================================

  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-100">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-600/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 right-1/3 h-[400px] w-[400px] rounded-full bg-emerald-600/[0.05] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Page Header */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-violet-400">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-inset ring-violet-500/20">
              <SettingsIcon size={13} />
            </span>

            <span>System Configuration</span>
          </div>

          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight text-white">
            Settings
            <Sparkles size={20} className="text-violet-400/70" />
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage your pharmacy information and application preferences.
          </p>
        </div>

        {/* Status Messages */}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.08] to-transparent p-4 text-sm text-red-300 backdrop-blur-sm"
          >
            <AlertCircle size={19} className="shrink-0" />

            <div className="flex-1">
              {error}

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ml-2 font-semibold underline underline-offset-2 transition hover:text-red-200"
              >
                Reload page
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            role="status"
            className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm backdrop-blur-sm ${
              saved
                ? "border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent text-emerald-300"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-300"
            }`}
          >
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {/* Navigation Tabs */}

        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-white/[0.06] pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-violet-500/[0.15] to-fuchsia-500/[0.08] text-violet-300 ring-1 ring-inset ring-violet-500/30 shadow-lg shadow-violet-600/10"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Panel */}

        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="h-1 w-1 rounded-full bg-violet-400" />

              <h2 className="text-lg font-semibold text-white">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
            </div>

            <p className="mt-1 text-sm text-zinc-500">
              Configure your PharmaCore application.
            </p>
          </div>

          <div className="p-5 sm:p-7">
            {/* General Settings */}

            {activeTab === "general" && (
              <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                <Field
                  label="Pharmacy Name"
                  name="pharmacyName"
                  value={settings.pharmacyName}
                  onChange={updateSetting}
                  disabled={loading || saving}
                  placeholder="Pharmacy name"
                  icon={Building2}
                />

                <Field
                  label="Contact Email"
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={updateSetting}
                  disabled={loading || saving}
                  placeholder="admin@example.com"
                  icon={Mail}
                />

                <Field
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={updateSetting}
                  disabled={loading || saving}
                  placeholder="Phone number"
                  icon={Phone}
                />

                <Field
                  label="Pharmacy Address"
                  name="address"
                  value={settings.address}
                  onChange={updateSetting}
                  disabled={loading || saving}
                  placeholder="Pharmacy address"
                  icon={MapPin}
                />
              </div>
            )}

            {/* Notification Settings */}

            {activeTab === "notifications" && (
              <div className="max-w-3xl">
                <Toggle
                  name="lowStockAlerts"
                  label="Low Stock Alerts"
                  description="Get notified when products fall below minimum stock levels."
                  checked={settings.lowStockAlerts}
                  onChange={updateSetting}
                  disabled={loading || saving}
                />

                <Toggle
                  name="expiryAlerts"
                  label="Expiry Warnings"
                  description="Receive warnings about medicines approaching expiry."
                  checked={settings.expiryAlerts}
                  onChange={updateSetting}
                  disabled={loading || saving}
                />

                <Toggle
                  name="purchaseAlerts"
                  label="Purchase Updates"
                  description="Receive updates about purchase orders and deliveries."
                  checked={settings.purchaseAlerts}
                  onChange={updateSetting}
                  disabled={loading || saving}
                />
              </div>
            )}

            {/* Security Settings */}

            {activeTab === "security" && (
              <div className="max-w-3xl space-y-5">
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-4">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />

                  <div className="relative flex gap-4">
                    <IconBox
                      size="lg"
                      className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                    >
                      <ShieldCheck size={22} />
                    </IconBox>

                    <div>
                      <h3 className="font-medium text-white">
                        Account Security
                      </h3>

                      <p className="mt-1 text-sm text-zinc-400">
                        Keep your password private and use a strong password
                        to protect pharmacy records.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <h3 className="font-medium text-white">
                    Password Management
                  </h3>

                  <p className="mt-1 text-sm text-zinc-400">
                    Password changes must be connected to an authenticated
                    backend endpoint.
                  </p>

                  <p className="mt-3 text-xs text-zinc-600">
                    Password and session management are not connected yet.
                  </p>
                </div>
              </div>
            )}

            {/* Application Preferences */}

            {activeTab === "preferences" && (
              <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="currency"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Currency
                  </label>

                  <select
                    id="currency"
                    value={settings.currency}
                    disabled={loading || saving}
                    onChange={(event) =>
                      updateSetting("currency", event.target.value)
                    }
                    className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-50"
                  >
                    <option value="GHS" className="bg-[#111113]">
                      GHS (GH₵)
                    </option>

                    <option value="USD" className="bg-[#111113]">
                      USD ($)
                    </option>

                    <option value="NGN" className="bg-[#111113]">
                      NGN (₦)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dateFormat"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Date Format
                  </label>

                  <select
                    id="dateFormat"
                    value={settings.dateFormat}
                    disabled={loading || saving}
                    onChange={(event) =>
                      updateSetting("dateFormat", event.target.value)
                    }
                    className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-50"
                  >
                    <option value="DD/MM/YYYY" className="bg-[#111113]">
                      DD/MM/YYYY
                    </option>

                    <option value="MM/DD/YYYY" className="bg-[#111113]">
                      MM/DD/YYYY
                    </option>

                    <option value="YYYY-MM-DD" className="bg-[#111113]">
                      YYYY-MM-DD
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="theme"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Interface Theme
                  </label>

                  <select
                    id="theme"
                    value={settings.theme}
                    disabled={loading || saving}
                    onChange={(event) =>
                      updateSetting("theme", event.target.value)
                    }
                    className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-violet-500/40 focus:bg-black/60 focus:ring-4 focus:ring-violet-500/[0.08] disabled:opacity-50"
                  >
                    <option value="Dark" className="bg-[#111113]">
                      Dark
                    </option>

                    <option value="Light" className="bg-[#111113]">
                      Light
                    </option>

                    <option value="System" className="bg-[#111113]">
                      System Default
                    </option>
                  </select>

                  <p className="mt-2 text-xs text-zinc-600">
                    The selected theme is saved, but does not yet change the
                    overall interface.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}

          <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-black/20 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-sm text-zinc-500">
              {saved
                ? "All changes are saved to your account."
                : "Remember to save your changes."}
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetSettings}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Reset Changes
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-xl hover:shadow-violet-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {saving ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="relative animate-spin"
                    />
                    <span className="relative">Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={17} className="relative" />
                    <span className="relative">Saved</span>
                  </>
                ) : (
                  <>
                    <Save size={17} className="relative" />
                    <span className="relative">Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          PharmaCore · Pharmacy Management System
        </p>
      </div>
    </div>
  );
};

export default Settings;
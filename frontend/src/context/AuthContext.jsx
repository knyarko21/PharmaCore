
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "./authHelpers";

const AuthContext = createContext(null);

const TAB_ID_KEY = "pharmacore_tab_id";

// ======================================================
// Role Hierarchy
// ======================================================

const ROLE_HIERARCHY = {
  superadmin: ["superadmin", "admin"],
  admin: ["admin"],
  pharmacist: ["pharmacist"],
  cashier: ["cashier"],
  inventory_manager: ["inventory_manager"],
  procurement: ["procurement"],
};

// ======================================================
// Tab Identification
// ======================================================

const createUniqueId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getOrCreateTabId = () => {
  try {
    let tabId = sessionStorage.getItem(TAB_ID_KEY);

    if (!tabId) {
      tabId = createUniqueId();
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    }

    return tabId;
  } catch {
    return createUniqueId();
  }
};

// ======================================================
// Auth Provider
// ======================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = useCallback((incomingUser) => {
    if (!incomingUser) return null;

    const roleValue =
      typeof incomingUser.role === "string"
        ? incomingUser.role.toLowerCase()
        : incomingUser.role;

    return {
      ...incomingUser,
      role: roleValue || null,
      roles: Array.isArray(incomingUser.roles)
        ? incomingUser.roles.map((role) =>
            String(role).toLowerCase()
          )
        : roleValue
          ? [roleValue]
          : [],
    };
  }, []);

  // ======================================================
  // Token Synchronization
  // ======================================================

  const syncToken = useCallback((token) => {
    if (token) {
      setStoredToken(token);

      api.defaults.headers = api.defaults.headers || {};
      api.defaults.headers.common =
        api.defaults.headers.common || {};

      api.defaults.headers.common.Authorization =
        `Bearer ${token}`;
    } else {
      clearStoredToken();

      if (api.defaults?.headers?.common) {
        delete api.defaults.headers.common.Authorization;
      }
    }
  }, []);

  // ======================================================
  // Session Restoration and Duplicate Tab Protection
  // ======================================================

  useEffect(() => {
    let cancelled = false;
    let tabChannel = null;

    const restoreSession = async () => {
      const tabId = getOrCreateTabId();
      const instanceId = createUniqueId();

      let duplicateTab = false;

      if (typeof BroadcastChannel !== "undefined") {
        try {
          tabChannel = new BroadcastChannel(
            `pharmacore_tab_${tabId}`
          );

          tabChannel.onmessage = (event) => {
            const message = event.data;

            if (!message || message.instanceId === instanceId) {
              return;
            }

            if (message.type === "TAB_PROBE") {
              tabChannel.postMessage({
                type: "TAB_RESPONSE",
                challengeId: message.challengeId,
                instanceId,
              });
            }
          };

          const challengeId = createUniqueId();

          const duplicateDetected = await new Promise(
            (resolve) => {
              const timeout = window.setTimeout(() => {
                resolve(false);
              }, 500);

              const originalHandler = tabChannel.onmessage;

              tabChannel.onmessage = (event) => {
                const message = event.data;

                if (
                  message?.type === "TAB_RESPONSE" &&
                  message.challengeId === challengeId &&
                  message.instanceId !== instanceId
                ) {
                  window.clearTimeout(timeout);
                  resolve(true);
                  return;
                }

                originalHandler?.(event);
              };

              tabChannel.postMessage({
                type: "TAB_PROBE",
                challengeId,
                instanceId,
              });
            }
          );

          duplicateTab = duplicateDetected;

          if (duplicateTab) {
            tabChannel.close();
            tabChannel = null;
          }
        } catch (error) {
          console.warn(
            "Duplicate tab detection unavailable:",
            error
          );
        }
      }

      if (cancelled) return;

      if (duplicateTab) {
        clearStoredToken();

        try {
          sessionStorage.removeItem(TAB_ID_KEY);
        } catch {
          // Ignore unavailable session storage.
        }

        syncToken(null);
        setUser(null);
        setLoading(false);

        return;
      }

      const token = getStoredToken();

      if (!token) {
        if (!cancelled) {
          setLoading(false);
        }

        return;
      }

      syncToken(token);

      try {
        const response = await api.get("/auth/me");

        if (cancelled) return;

        if (response.data?.success && response.data?.user) {
          setUser(normalizeUser(response.data.user));
        } else {
          clearStoredToken();
          syncToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Session restore error:", error);

        if (!cancelled) {
          clearStoredToken();
          syncToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;

      if (tabChannel) {
        tabChannel.close();
        tabChannel = null;
      }
    };
  }, [normalizeUser, syncToken]);

  // ======================================================
  // Login
  // ======================================================

  const login = useCallback(
    async (email, password) => {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Login failed."
        );
      }

      const { token, user: loggedInUser } = response.data;

      if (!token || !loggedInUser) {
        throw new Error(
          "Login succeeded but the session payload was incomplete."
        );
      }

      getOrCreateTabId();

      syncToken(token);
      setUser(normalizeUser(loggedInUser));

      return normalizeUser(loggedInUser);
    },
    [normalizeUser, syncToken]
  );

  // ======================================================
  // Login With Token
  // ======================================================

  const loginWithToken = useCallback(
    (loggedInUser, token) => {
      if (!token || !loggedInUser) {
        throw new Error(
          "Registration succeeded but the session was incomplete."
        );
      }

      getOrCreateTabId();

      syncToken(token);
      setUser(normalizeUser(loggedInUser));

      return normalizeUser(loggedInUser);
    },
    [normalizeUser, syncToken]
  );

  // ======================================================
  // Logout
  // ======================================================

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      clearStoredToken();
      syncToken(null);
      setUser(null);

      try {
        sessionStorage.removeItem(TAB_ID_KEY);
      } catch {
        // Ignore unavailable session storage.
      }
    }
  }, [syncToken]);

  // ======================================================
  // Exact Role Checking
  // ======================================================

  const hasRole = useCallback(
    (roleToCheck) => {
      if (!user) return false;

      const normalizedRole = String(roleToCheck).toLowerCase();

      const roles = Array.isArray(user.roles)
        ? user.roles
        : user.role
          ? [user.role]
          : [];

      return roles.some(
        (role) =>
          String(role).toLowerCase() === normalizedRole
      );
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (rolesToCheck = []) => {
      if (!user) return false;

      return rolesToCheck.some((role) => hasRole(role));
    },
    [hasRole]
  );

  // ======================================================
  // Inherited Role Permission Checking
  // ======================================================

  const hasRolePermission = useCallback(
    (rolesToCheck = []) => {
      if (!user || !Array.isArray(rolesToCheck)) {
        return false;
      }

      const userRoles = [
        ...(Array.isArray(user.roles) ? user.roles : []),
        ...(user.role ? [user.role] : []),
      ].map((role) => String(role).toLowerCase());

      const inheritedRoles = new Set();

      userRoles.forEach((role) => {
        const permissions = ROLE_HIERARCHY[role] || [role];

        permissions.forEach((permission) => {
          inheritedRoles.add(permission);
        });
      });

      return rolesToCheck.some((role) =>
        inheritedRoles.has(String(role).toLowerCase())
      );
    },
    [user]
  );

  // ======================================================
  // Auth Context Value
  // ======================================================

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithToken,
      logout,
      hasRole,
      hasAnyRole,
      hasRolePermission,
    }),
    [
      user,
      loading,
      login,
      loginWithToken,
      logout,
      hasRole,
      hasAnyRole,
      hasRolePermission,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ======================================================
// Auth Hook
// ======================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore an existing login session when the app opens.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = getStoredToken();

      if (!token) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      api.defaults.headers = api.defaults.headers || {};
      api.defaults.headers.common =
        api.defaults.headers.common || {};

      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      try {
        const response = await api.get("/auth/me");

        if (cancelled) return;

        if (response.data?.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          clearStoredToken();

          delete api.defaults.headers.common.Authorization;

          setUser(null);
        }
      } catch (error) {
        console.error("Session restore error:", error);

        if (!cancelled) {
          clearStoredToken();

          delete api.defaults.headers.common.Authorization;

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
    };
  }, []);

  // Normal login using email and password.
  const login = useCallback(async (email, password) => {
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
        "Login succeeded but the user session was incomplete."
      );
    }

    setStoredToken(token);

    api.defaults.headers = api.defaults.headers || {};
    api.defaults.headers.common =
      api.defaults.headers.common || {};

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    setUser(loggedInUser);

    return loggedInUser;
  }, []);

  // Complete authentication when registration already returned
  // a valid token and user from the backend.
  const loginWithToken = useCallback((loggedInUser, token) => {
    if (!token || !loggedInUser) {
      throw new Error(
        "Registration succeeded but the user session was incomplete."
      );
    }

    setStoredToken(token);

    api.defaults.headers = api.defaults.headers || {};
    api.defaults.headers.common =
      api.defaults.headers.common || {};

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    setUser(loggedInUser);

    return loggedInUser;
  }, []);

  // Log out and clear the local session.
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      clearStoredToken();

      if (api?.defaults?.headers?.common) {
        delete api.defaults.headers.common.Authorization;
      }

      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithToken,
      logout,
    }),
    [user, loading, login, loginWithToken, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};
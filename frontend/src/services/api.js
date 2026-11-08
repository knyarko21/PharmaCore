
import axios from "axios";

import {
  getStoredToken,
  clearStoredToken,
} from "../context/authHelpers";

// ======================================================
// API Configuration
// ======================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// ======================================================
// Request Interceptor
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    // Attach JWT authentication when available.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // Let the browser/Axios generate the multipart boundary
    // when uploading FormData.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else if (config.data && typeof config.data === "object") {
      // Normal JSON API requests.
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ======================================================
// Response Interceptor
// ======================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredToken();

      delete api.defaults.headers.common.Authorization;
    }

    return Promise.reject(error);
  }
);

export default api;
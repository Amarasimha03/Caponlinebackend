import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://testbackend-j6dn.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── REQUEST interceptor — reads fresh token on EVERY call ────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── RESPONSE interceptor — auto-logout on non-login 401 errors (expired/invalid token) ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status     = error.response?.status;
    const url        = error.config?.url || "";
    const isLoginUrl = url.includes("/auth/login") || url === "/login";

    if (status === 401 && !isLoginUrl) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("portal_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

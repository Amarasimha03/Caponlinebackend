import axios from "axios";

const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_URL = IS_LOCAL ? "http://localhost:5000/api" : (process.env.REACT_APP_API_URL || "/api");

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
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
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginUrl = url.includes("/auth/login") || url === "/login";

    if (status === 401 && !isLoginUrl) {
      let user = null;
      try { user = JSON.parse(localStorage.getItem('user')); } catch (e) { }

      // Never auto-logout admin
      if (user && user.role === 'admin') {
        console.warn('Admin received 401, preventing auto-logout');
        return Promise.reject(error);
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("portal_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

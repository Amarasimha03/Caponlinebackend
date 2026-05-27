import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://testbackend-j6dn.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST interceptor — runs before every single API call
// Reads the latest token from localStorage and injects it into the header
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

// RESPONSE interceptor — only auto-logout on login 401, never on other calls
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || "";
    const isLoginUrl = url.includes("/login") || url.includes("/auth");

    // Only redirect to login if the login call itself fails with 401
    // Never auto-logout on monitoring, assessments, employees, or any other endpoint
    if (status === 401 && isLoginUrl) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("portal_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

// REACT_APP_API_URL can be set to override (e.g. http://localhost:5000/api in dev).
// In production on Render, the frontend is served by the same Express server,
// so '/api' (relative) resolves correctly to the right host automatically.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || error.response?.config?.url || "";

    // Only force logout if the LOGIN call itself returns 401
    // Never auto-logout on other API calls
    const isLoginEndpoint = url.includes("/auth/login") || url.includes("/login");

    if (status === 401 && isLoginEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("portal_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

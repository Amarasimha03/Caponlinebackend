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
  (res) => res,
  (err) => {
    // Avoid aggressive global logout on generic 401 responses.
    // Legitimate session expirations are caught and handled during profile fetching in useAuthStore.
    return Promise.reject(err);
  }
);

export default api;

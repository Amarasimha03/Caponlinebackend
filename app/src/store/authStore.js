import { create } from 'zustand';
import api from '../services/api';

const LS_USER_KEY   = 'portal_user';
const LS_TOKEN_KEY  = 'token';

const useAuthStore = create((set, get) => ({
  user:      JSON.parse(localStorage.getItem(LS_USER_KEY) || 'null'),
  token:     localStorage.getItem(LS_TOKEN_KEY),
  isLoading: false,
  error:     null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('portal_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });

      console.log("Token saved:", localStorage.getItem("token") ? "YES" : "NO — PROBLEM HERE");

      // Save session to Google Sheets (non-blocking)
      if (data.user?._id) {
        api.post('/state/session/save', {
          userId: data.user._id,
          name:   data.user.fullName,
          email:  data.user.email,
          role:   data.user.role,
          status: 'active',
          loginTime: new Date().toISOString(),
        }).catch(() => {});
      }

      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('portal_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      const userId = get().user?._id;
      if (userId) {
        api.post('/state/session/save', {
          userId,
          status:     'logged_out',
          logoutTime: new Date().toISOString(),
        }).catch(() => {});
      }
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('portal_user');
    localStorage.removeItem('activeTest');
    localStorage.removeItem('examProgress');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const hasUser = !!get().user;
    if (!hasUser) {
      set({ isLoading: true });
    }
    try {
      const { data } = await api.get('/auth/me');
      // Persist user to localStorage so it survives refreshes
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('portal_user', JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });

      // Verify session with Google Sheets Backend (non-blocking, do NOT force logout unless explicitly requested via Logout button)
      if (data.user?._id) {
        try {
          await api.get(`/state/session/${data.user._id}`);
          // We fetch it but we do NOT automatically evict the local session.
          // This ensures that active users are never logged out unexpectedly due to sheet sync lag/issues.
        } catch {
          // Session check failed — continue with local session
        }
      }
    } catch (err) {
      // Do NOT clear user/token on error to ensure users stay logged in strictly until they manually click the Logout button.
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  isAdmin:    () => get().user?.role === 'admin',
  isEmployee: () => get().user?.role === 'employee',
}));

export default useAuthStore;

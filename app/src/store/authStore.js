import { create } from 'zustand';
import api from '../services/api';

const LS_USER_KEY   = 'portal_user';
const LS_TOKEN_KEY  = 'token';

const useAuthStore = create((set, get) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem(LS_USER_KEY);
      if (!stored || stored === 'undefined') return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  })(),
  token:     localStorage.getItem(LS_TOKEN_KEY),
  isLoading: false,  // Always false on init — user/token are hydrated from localStorage synchronously
  error:     null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Clear old caches first to prevent showing other user's data
      localStorage.removeItem('employee_assessments_cache');
      localStorage.removeItem('employee_assessments_timestamp');
      localStorage.removeItem('admin_assessments_list');
      localStorage.removeItem('admin_employees_list');
      localStorage.removeItem('admin_questions_list');

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
      localStorage.removeItem('employee_assessments_cache');
      localStorage.removeItem('employee_assessments_timestamp');
      localStorage.removeItem('admin_assessments_list');
      localStorage.removeItem('admin_employees_list');
      localStorage.removeItem('admin_questions_list');

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
    localStorage.removeItem('employee_assessments_cache');
    localStorage.removeItem('employee_assessments_timestamp');
    localStorage.removeItem('admin_assessments_list');
    localStorage.removeItem('admin_employees_list');
    localStorage.removeItem('admin_questions_list');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Silent background refresh — never set isLoading=true here.
    // The user object is already hydrated from localStorage on store init,
    // so the page renders instantly on refresh without any loading flicker or redirect.
    try {
      const { data } = await api.get('/auth/me', {
        // Mark this request so the 401 interceptor in api.js skips auto-logout
        _isBackgroundRefresh: true,
      });
      // Update in-memory user and persist fresh data
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('portal_user', JSON.stringify(data.user));
      set({ user: data.user });

      // Non-blocking session sync with Google Sheets
      if (data.user?._id) {
        api.get(`/state/session/${data.user._id}`).catch(() => {});
      }
    } catch (err) {
      // Network error or server cold-starting on Render — keep the existing local session.
      // Users should only be logged out when they explicitly click Sign Out.
      console.warn('[AuthStore] fetchMe failed — keeping local session:', err.message);
    }
  },

  clearError: () => set({ error: null }),
  isAdmin:    () => get().user?.role === 'admin',
  isEmployee: () => get().user?.role === 'employee',
}));

export default useAuthStore;

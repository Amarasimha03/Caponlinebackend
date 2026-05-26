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
      localStorage.setItem(LS_TOKEN_KEY, data.token);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });

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
      localStorage.setItem(LS_TOKEN_KEY, data.token);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(data.user));
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
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem('activeTest');
    localStorage.removeItem('examProgress');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    if (!token) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      // Persist user to localStorage so it survives refreshes
      localStorage.setItem(LS_USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });

      // Verify session with Google Sheets Backend
      if (data.user?._id) {
        try {
          const sessionRes = await api.get(`/state/session/${data.user._id}`);
          if (sessionRes.data.success && sessionRes.data.session) {
            const sheetSession = sessionRes.data.session;
            if (sheetSession.status === 'inactive' || sheetSession.status === 'logged_out') {
              localStorage.removeItem(LS_TOKEN_KEY);
              localStorage.removeItem(LS_USER_KEY);
              set({ user: null, token: null });
            }
          }
        } catch {
          // Session check failed — continue with local session
        }
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem(LS_TOKEN_KEY);
        localStorage.removeItem(LS_USER_KEY);
        set({ user: null, token: null });
      }
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  isAdmin:    () => get().user?.role === 'admin',
  isEmployee: () => get().user?.role === 'employee',
}));

export default useAuthStore;

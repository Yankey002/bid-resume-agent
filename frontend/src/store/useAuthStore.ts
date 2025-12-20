import { create } from 'zustand';
import api from '../services/api';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | string;
  is_active: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** 更新 token 并同步到 localStorage */
  setToken: (token: string | null) => void;
  /** 更新当前用户信息（来自 /auth/me） */
  setUser: (user: AuthUser | null) => void;
  /** 清理 token 与用户信息 */
  logout: () => void;
  /** 拉取当前用户信息并写入 store */
  refreshMe: () => Promise<void>;
}

const ACCESS_TOKEN_KEY = 'access_token';

const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem(ACCESS_TOKEN_KEY),
  user: null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    set({ token: null, user: null });
  },
  refreshMe: async () => {
    const token = get().token;
    if (!token) {
      set({ user: null });
      return;
    }
    const resp = await api.get('/auth/me', { skipErrorHandler: true });
    set({ user: (resp.data as AuthUser | undefined) || null });
  },
}));

export default useAuthStore;

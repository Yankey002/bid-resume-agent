import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  isLoading: boolean;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
}

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  isLoading: false,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

export default useAppStore;

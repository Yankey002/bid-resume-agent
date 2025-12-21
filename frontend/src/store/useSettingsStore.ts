import { create } from 'zustand';

interface SettingsState {
  selectedKey: string;
  setSelectedKey: (key: string) => void;

  // Sidebar State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

const useSettingsStore = create<SettingsState>((set) => ({
  selectedKey: 'general',
  setSelectedKey: (key) => set({ selectedKey: key }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));

export default useSettingsStore;

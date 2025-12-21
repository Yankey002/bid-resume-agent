import { create } from 'zustand';
import type { Template } from '../types';

interface TemplateState {
  // Search State
  searchText: string;
  setSearchText: (text: string) => void;

  // Data State
  templates: Template[];
  setTemplates: (templates: Template[]) => void;

  // Selection State
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Refresh Trigger
  refreshTrigger: number;
  triggerRefresh: () => void;

  // Sidebar State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

const useTemplateStore = create<TemplateState>((set, get) => ({
  searchText: '',
  setSearchText: (text) => set({ searchText: text }),

  templates: [],
  setTemplates: (templates) => set({ templates }),

  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((i) => i !== id) });
    } else {
      set({ selectedIds: [...selectedIds, id] });
    }
  },
  selectAll: () => {
    const { templates } = get();
    set({ selectedIds: templates.map((t) => t.id) });
  },
  clearSelection: () => set({ selectedIds: [] }),

  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));

export default useTemplateStore;

import { create } from 'zustand';
import type { Candidate } from '../types';

interface ResumeState {
  // Search State
  searchText: string;
  setSearchText: (text: string) => void;

  // Data State
  candidates: Candidate[];
  setCandidates: (candidates: Candidate[]) => void;

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

const useResumeStore = create<ResumeState>((set, get) => ({
  searchText: '',
  setSearchText: (text) => set({ searchText: text }),

  candidates: [],
  setCandidates: (candidates) => set({ candidates }),

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
    const { candidates } = get();
    set({ selectedIds: candidates.map((c) => c.id) });
  },
  clearSelection: () => set({ selectedIds: [] }),

  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));

export default useResumeStore;

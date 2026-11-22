import { create } from 'zustand';

interface TabState {
  activeTab: number; // 0 = Camera, 1 = Albums
  setActiveTab: (tab: number) => void;
}

export const useMainTabStore = create<TabState>((set) => ({
  activeTab: 0,
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

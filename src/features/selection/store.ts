import { create } from "zustand";

interface SelectionState {
  isSelectionMode: boolean;
  selectedIds: Set<string>;

  enterSelectionMode: (initialId?: string) => void;
  exitSelectionMode: () => void;
  toggleItem: (id: string) => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  toggleGroup: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  isSelectionMode: false,
  selectedIds: new Set<string>(),

  enterSelectionMode: (initialId?: string) => {
    set(() => {
      const selected = new Set<string>();
      if (initialId) selected.add(initialId);
      return {
        isSelectionMode: true,
        selectedIds: selected,
      };
    });
  },

  exitSelectionMode: () => {
    set({
      isSelectionMode: false,
      selectedIds: new Set<string>(),
    });
  },

  toggleItem: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      // If user deselects last item, exit selection mode
      if (next.size === 0) {
        return {
          isSelectionMode: false,
          selectedIds: next,
        };
      }

      return {
        isSelectionMode: true,
        selectedIds: next,
      };
    });
  },

  selectItem: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      next.add(id);
      return {
        isSelectionMode: true,
        selectedIds: next,
      };
    });
  },

  deselectItem: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      next.delete(id);
      return {
        isSelectionMode: next.size > 0,
        selectedIds: next,
      };
    });
  },

  selectAll: (ids: string[]) => {
    set({
      isSelectionMode: ids.length > 0,
      selectedIds: new Set(ids),
    });
  },

  toggleGroup: (ids: string[]) => {
    if (ids.length === 0) return;
    set((state) => {
      const next = new Set(state.selectedIds);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return {
        isSelectionMode: next.size > 0,
        selectedIds: next,
      };
    });
  },

  clearSelection: () => {
    set({
      selectedIds: new Set<string>(),
    });
  },
}));

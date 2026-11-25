import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';
import { MediaItem } from './types';

const FAVORITES_FILE = `${FileSystem.documentDirectory ?? ''}glimpse-favorites.json`;

interface FavoritesState {
  favoritesMap: Record<string, MediaItem>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (item: MediaItem) => void;
  pruneDeleted: (ids: string[]) => void;
}

function persistFavorites(map: Record<string, MediaItem>) {
  if (!FileSystem.documentDirectory) return;
  FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify(map)).catch(() => {});
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoritesMap: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated || !FileSystem.documentDirectory) {
      set({ hydrated: true });
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(FAVORITES_FILE);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(FAVORITES_FILE);
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          set({ favoritesMap: parsed as Record<string, MediaItem>, hydrated: true });
          return;
        }
      }
    } catch {
      // Ignore corrupt favorites file and start clean
    }
    set({ hydrated: true });
  },

  toggleFavorite: (item: MediaItem) => {
    set((state) => {
      const next = { ...state.favoritesMap };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      persistFavorites(next);
      return { favoritesMap: next };
    });
  },

  pruneDeleted: (ids: string[]) => {
    if (ids.length === 0) return;
    set((state) => {
      let changed = false;
      const next = { ...state.favoritesMap };
      for (const id of ids) {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      }
      if (!changed) return state;
      persistFavorites(next);
      return { favoritesMap: next };
    });
  },
}));

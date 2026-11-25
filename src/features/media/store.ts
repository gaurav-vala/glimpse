import { create } from "zustand";
import { mediaService } from "./mediaService";
import { Collection, SourceKey } from "./types";

interface MediaStoreState {
  collections: Record<SourceKey, Collection>;
  inFlight: Record<SourceKey, boolean>;

  getCollection: (sourceKey: SourceKey) => Collection;
  loadInitial: (sourceKey: SourceKey, cameraOnly?: boolean) => Promise<void>;
  loadNextPage: (sourceKey: SourceKey, cameraOnly?: boolean) => Promise<void>;
  refresh: (sourceKey: SourceKey, cameraOnly?: boolean) => Promise<void>;
  removeItems: (ids: string[]) => void;
}

const initialCollection: Collection = {
  items: [],
  hasNextPage: true,
  totalCount: 0,
  status: "idle",
  error: null,
};

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  collections: {
    all: { ...initialCollection },
    camera: { ...initialCollection },
    favorites: { ...initialCollection },
  },
  inFlight: {
    all: false,
    camera: false,
    favorites: false,
  },

  getCollection: (sourceKey: SourceKey) => {
    return get().collections[sourceKey] || initialCollection;
  },

  loadInitial: async (sourceKey: SourceKey, cameraOnly = false) => {
    const state = get();
    if (state.inFlight[sourceKey]) return;

    const current = state.collections[sourceKey];
    if (current && current.items.length > 0 && current.status !== "error") {
      return; // Already loaded
    }

    set((s) => ({
      inFlight: { ...s.inFlight, [sourceKey]: true },
      collections: {
        ...s.collections,
        [sourceKey]: {
          ...(s.collections[sourceKey] || initialCollection),
          status: "loading",
          error: null,
        },
      },
    }));

    try {
      const t0 = Date.now();
      const albumId = sourceKey.startsWith("album:")
        ? sourceKey.replace("album:", "")
        : undefined;
      const res = await mediaService.getMediaPage({
        first: 90,
        albumId,
        cameraOnly: cameraOnly || sourceKey === "camera",
      });
      console.log(
        `[Perf:MediaPage] source=${sourceKey} count=${res.items.length} total=${res.totalCount} ms=${Date.now() - t0}`
      );

      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            items: res.items
              .slice()
              .sort((a, b) => b.creationTime - a.creationTime),
            endCursor: res.endCursor,
            hasNextPage: res.hasNextPage,
            totalCount: res.totalCount,
            status: "idle",
            error: null,
          },
        },
      }));
    } catch (err: any) {
      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            ...(s.collections[sourceKey] || initialCollection),
            status: "error",
            error: err?.message || "Failed to load media",
          },
        },
      }));
    }
  },

  loadNextPage: async (sourceKey: SourceKey, cameraOnly = false) => {
    const state = get();
    if (state.inFlight[sourceKey]) return;

    const current = state.collections[sourceKey] || initialCollection;
    if (!current.hasNextPage || !current.endCursor) return;

    set((s) => ({
      inFlight: { ...s.inFlight, [sourceKey]: true },
    }));

    try {
      const albumId = sourceKey.startsWith("album:")
        ? sourceKey.replace("album:", "")
        : undefined;
      const res = await mediaService.getMediaPage({
        first: 90,
        after: current.endCursor,
        albumId,
        cameraOnly: cameraOnly || sourceKey === "camera",
      });

      // Deduplicate by ID and sort only new page items so existing scroll positions stay stable
      const existingIds = new Set(current.items.map((i) => i.id));
      const freshItems = res.items
        .filter((i) => !existingIds.has(i.id))
        .sort((a, b) => b.creationTime - a.creationTime);

      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            items: [...current.items, ...freshItems],
            endCursor: res.endCursor,
            hasNextPage: res.hasNextPage,
            totalCount: res.totalCount,
            status: "idle",
            error: null,
          },
        },
      }));
    } catch (err: any) {
      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            ...current,
            status: "error",
            error: err?.message || "Failed to load next page",
          },
        },
      }));
    }
  },

  refresh: async (sourceKey: SourceKey, cameraOnly = false) => {
    const state = get();
    if (state.inFlight[sourceKey]) return;

    const loadedCount = state.collections[sourceKey]?.items.length ?? 0;
    const preserveCount = Math.min(Math.max(90, loadedCount), 540);

    set((s) => ({
      inFlight: { ...s.inFlight, [sourceKey]: true },
      collections: {
        ...s.collections,
        [sourceKey]: {
          ...(s.collections[sourceKey] || initialCollection),
          status: "refreshing",
        },
      },
    }));

    try {
      const albumId = sourceKey.startsWith("album:")
        ? sourceKey.replace("album:", "")
        : undefined;
      const res = await mediaService.getMediaPage({
        first: preserveCount,
        albumId,
        cameraOnly: cameraOnly || sourceKey === "camera",
      });

      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            items: res.items
              .slice()
              .sort((a, b) => b.creationTime - a.creationTime),
            endCursor: res.endCursor,
            hasNextPage: res.hasNextPage,
            totalCount: res.totalCount,
            status: "idle",
            error: null,
          },
        },
      }));
    } catch (err: any) {
      set((s) => ({
        inFlight: { ...s.inFlight, [sourceKey]: false },
        collections: {
          ...s.collections,
          [sourceKey]: {
            ...(s.collections[sourceKey] || initialCollection),
            status: "error",
            error: err?.message || "Failed to refresh",
          },
        },
      }));
    }
  },

  removeItems: (ids: string[]) => {
    const idSet = new Set(ids);
    set((s) => {
      const updatedCollections: Record<SourceKey, Collection> = {
        ...s.collections,
      };
      for (const [key, col] of Object.entries(s.collections)) {
        if (!col) continue;
        const filtered = col.items.filter((item) => !idSet.has(item.id));
        const removedCount = col.items.length - filtered.length;
        updatedCollections[key as SourceKey] = {
          ...col,
          items: filtered,
          totalCount: Math.max(0, col.totalCount - removedCount),
        };
      }
      return { collections: updatedCollections };
    });
  },
}));

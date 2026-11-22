import { useEffect, useCallback } from 'react';
import { useMediaStore } from './store';
import { SourceKey, Collection } from './types';
import { mediaService } from './mediaService';

/**
 * useCollection
 * Hook for consuming, paging, and auto-refreshing media collections.
 */
export function useCollection(sourceKey: SourceKey, cameraOnly = false): {
  collection: Collection;
  loadNextPage: () => void;
  refresh: () => void;
} {
  const collection = useMediaStore((state) => state.getCollection(sourceKey));
  const loadInitial = useMediaStore((state) => state.loadInitial);
  const loadNextPageStore = useMediaStore((state) => state.loadNextPage);
  const refreshStore = useMediaStore((state) => state.refresh);

  useEffect(() => {
    loadInitial(sourceKey, cameraOnly);
  }, [sourceKey, cameraOnly, loadInitial]);

  // Subscribe to external media changes (e.g. new camera photo)
  useEffect(() => {
    const unsubscribe = mediaService.subscribeToChanges(() => {
      refreshStore(sourceKey, cameraOnly);
    });
    return unsubscribe;
  }, [sourceKey, cameraOnly, refreshStore]);

  const loadNextPage = useCallback(() => {
    loadNextPageStore(sourceKey, cameraOnly);
  }, [sourceKey, cameraOnly, loadNextPageStore]);

  const refresh = useCallback(() => {
    refreshStore(sourceKey, cameraOnly);
  }, [sourceKey, cameraOnly, refreshStore]);

  return {
    collection,
    loadNextPage,
    refresh,
  };
}

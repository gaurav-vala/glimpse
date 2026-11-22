import * as MediaLibrary from 'expo-media-library/legacy';
import { MediaItem, Album, PermissionStatusResult } from './types';

/**
 * MediaService
 * STRICT LAYERING RULE:
 * This is the ONLY module in the entire application that imports or calls expo-media-library.
 * All other modules (hooks, components, stores) consume MediaService.
 */

class MediaService {
  private cameraAlbumCache: Album | null = null;
  private albumCoverCache = new Map<string, string>();

  /**
   * Check current media library permissions.
   * Granular photo & video permissions requested without audio.
   */
  async checkPermissions(): Promise<PermissionStatusResult> {
    try {
      const res = await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
      return {
        granted: res.granted,
        canAskAgain: res.canAskAgain,
        accessPrivileges: res.accessPrivileges || (res.granted ? 'all' : 'none'),
        status: res.status,
      };
    } catch {
      return {
        granted: false,
        canAskAgain: true,
        accessPrivileges: 'none',
        status: 'denied',
      };
    }
  }

  /**
   * Request media library permissions.
   * Granular photo & video only, writeOnly = false.
   */
  async requestPermissions(): Promise<PermissionStatusResult> {
    try {
      const res = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      return {
        granted: res.granted,
        canAskAgain: res.canAskAgain,
        accessPrivileges: res.accessPrivileges || (res.granted ? 'all' : 'none'),
        status: res.status,
      };
    } catch {
      return {
        granted: false,
        canAskAgain: true,
        accessPrivileges: 'none',
        status: 'denied',
      };
    }
  }

  /**
   * Convert an expo-media-library asset into a plain MediaItem.
   */
  private formatAsset(asset: MediaLibrary.Asset): MediaItem {
    return {
      id: asset.id,
      uri: asset.uri,
      mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
      width: asset.width || 0,
      height: asset.height || 0,
      duration: asset.duration || 0,
      creationTime: asset.creationTime || asset.modificationTime || Date.now(),
      modificationTime: asset.modificationTime || Date.now(),
      filename: asset.filename || '',
      albumId: asset.albumId,
    };
  }

  /**
   * Find or resolve the DCIM/Camera album.
   */
  async getCameraAlbum(): Promise<Album | null> {
    if (this.cameraAlbumCache) return this.cameraAlbumCache;

    try {
      const albums = await MediaLibrary.getAlbumsAsync();
      const cameraAlbum = albums.find(
        (a) => a.title.toLowerCase() === 'camera' || a.title.toLowerCase() === 'dcim'
      );

      if (cameraAlbum) {
        this.cameraAlbumCache = {
          id: cameraAlbum.id,
          title: cameraAlbum.title,
          assetCount: cameraAlbum.assetCount,
        };
        return this.cameraAlbumCache;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Load a page of assets.
   * @param options.first Number of items to fetch (default 90)
   * @param options.after Cursor for next page
   * @param options.albumId Specific album to scope to (or null for all)
   * @param options.cameraOnly If true, strictly scopes to the Camera album
   */
  async getMediaPage(options: {
    first?: number;
    after?: string;
    albumId?: string;
    cameraOnly?: boolean;
  }): Promise<{
    items: MediaItem[];
    endCursor?: string;
    hasNextPage: boolean;
    totalCount: number;
  }> {
    const { first = 90, after, albumId, cameraOnly } = options;

    let targetAlbumId = albumId;
    if (cameraOnly && !targetAlbumId) {
      const cameraAlbum = await this.getCameraAlbum();
      if (cameraAlbum) {
        targetAlbumId = cameraAlbum.id;
      }
    }

    const queryOptions: MediaLibrary.AssetsOptions = {
      first,
      after,
      mediaType: ['photo', 'video'],
      sortBy: [['creationTime', false]],
      ...(targetAlbumId ? { album: targetAlbumId } : {}),
    };

    const pagedInfo = await MediaLibrary.getAssetsAsync(queryOptions);

    return {
      items: pagedInfo.assets.map(this.formatAsset),
      endCursor: pagedInfo.endCursor,
      hasNextPage: pagedInfo.hasNextPage,
      totalCount: pagedInfo.totalCount,
    };
  }

  /**
   * List device albums with item count > 0.
   */
  async getAlbums(): Promise<Album[]> {
    try {
      const rawAlbums = await MediaLibrary.getAlbumsAsync();
      const nonZero = rawAlbums.filter((a) => a.assetCount > 0);

      // Map to internal Album shape
      const albums: Album[] = nonZero.map((a) => ({
        id: a.id,
        title: a.title,
        assetCount: a.assetCount,
      }));

      // Sort order: Camera first, Screenshots second, then by count descending
      return albums.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        if (aTitle === 'camera' || aTitle === 'dcim') return -1;
        if (bTitle === 'camera' || bTitle === 'dcim') return 1;
        if (aTitle === 'screenshots') return -1;
        if (bTitle === 'screenshots') return 1;
        return b.assetCount - a.assetCount;
      });
    } catch {
      return [];
    }
  }

  /**
   * Get the newest asset URI as the cover for an album. Cached in-memory.
   */
  async getAlbumCover(albumId: string): Promise<string | null> {
    if (this.albumCoverCache.has(albumId)) {
      return this.albumCoverCache.get(albumId)!;
    }

    try {
      const res = await MediaLibrary.getAssetsAsync({
        first: 1,
        album: albumId,
        mediaType: ['photo', 'video'],
        sortBy: [['creationTime', false]],
      });

      if (res.assets.length > 0) {
        const cover = res.assets[0].uri;
        this.albumCoverCache.set(albumId, cover);
        return cover;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get detailed asset info (for InfoSheet or sharing).
   * Never call while scrolling the grid!
   */
  async getAssetInfo(assetId: string): Promise<MediaLibrary.AssetInfo | null> {
    try {
      return await MediaLibrary.getAssetInfoAsync(assetId);
    } catch {
      return null;
    }
  }

  /**
   * Delete assets through the native OS dialog.
   * Returns true if user confirmed and OS deleted successfully.
   * Returns false if cancelled.
   */
  async deleteAssets(assetIds: string[]): Promise<boolean> {
    if (assetIds.length === 0) return true;
    try {
      return await MediaLibrary.deleteAssetsAsync(assetIds);
    } catch (err) {
      console.warn('deleteAssetsAsync error:', err);
      throw err;
    }
  }

  /**
   * Subscribe to library changes.
   */
  subscribeToChanges(callback: () => void): () => void {
    const subscription = MediaLibrary.addListener(() => {
      callback();
    });
    return () => {
      subscription.remove();
    };
  }
}

export const mediaService = new MediaService();

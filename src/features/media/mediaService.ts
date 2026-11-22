import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as MediaLibrary from 'expo-media-library/legacy';
import { MediaItem, Album, PermissionStatusResult } from './types';
import { generateMockMediaItems, MOCK_ALBUMS } from './mockData';

/**
 * MediaService
 * STRICT LAYERING RULE:
 * This is the ONLY module in the entire application that imports or calls expo-media-library.
 *
 * EXPO GO & DEMO MODE SUPPORT:
 * On Android 13/14, the Google Play Store version of Expo Go dropped broad media permissions.
 * MediaService automatically detects Expo Go and switches to high-quality curated mock media
 * so development, scrolling, zoom, video playback, and deletion can be tested live.
 * When built as a standalone release APK, it automatically uses real device MediaStore.
 */

class MediaService {
  private cameraAlbumCache: Album | null = null;
  private albumCoverCache = new Map<string, string>();
  public albumTimestampCache = new Map<string, number>();
  private mockItems: MediaItem[] = [];
  private mockAlbums: Album[] = [];
  private changeListeners = new Set<() => void>();

  // Detect if running inside Expo Go
  public isExpoGo: boolean =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  // Force demo mode or allow real media
  private _demoMode: boolean = this.isExpoGo;

  constructor() {
    this.initMockData();
  }

  private initMockData() {
    this.mockItems = generateMockMediaItems();
    this.mockAlbums = [...MOCK_ALBUMS];
  }

  public get isDemoMode(): boolean {
    return this._demoMode;
  }

  public setDemoMode(val: boolean) {
    this._demoMode = val;
  }

  /**
   * Check current media library permissions.
   * Granular photo & video permissions requested without audio.
   */
  async checkPermissions(): Promise<PermissionStatusResult> {
    if (this._demoMode) {
      return {
        granted: true,
        canAskAgain: true,
        accessPrivileges: 'all',
        status: 'granted',
      };
    }

    try {
      const res = await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
      return {
        granted: res.granted,
        canAskAgain: res.canAskAgain,
        accessPrivileges: res.accessPrivileges || (res.granted ? 'all' : 'none'),
        status: res.status,
      };
    } catch {
      // If native check throws (e.g. in Expo Go), activate demo mode seamlessly
      this._demoMode = true;
      return {
        granted: true,
        canAskAgain: true,
        accessPrivileges: 'all',
        status: 'granted',
      };
    }
  }

  /**
   * Request media library permissions.
   * Granular photo & video only, writeOnly = false.
   */
  async requestPermissions(): Promise<PermissionStatusResult> {
    if (this._demoMode) {
      return {
        granted: true,
        canAskAgain: true,
        accessPrivileges: 'all',
        status: 'granted',
      };
    }

    try {
      const res = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (!res.granted && this.isExpoGo) {
        // Fallback to demo mode in Expo Go
        this._demoMode = true;
        return {
          granted: true,
          canAskAgain: true,
          accessPrivileges: 'all',
          status: 'granted',
        };
      }
      return {
        granted: res.granted,
        canAskAgain: res.canAskAgain,
        accessPrivileges: res.accessPrivileges || (res.granted ? 'all' : 'none'),
        status: res.status,
      };
    } catch {
      this._demoMode = true;
      return {
        granted: true,
        canAskAgain: true,
        accessPrivileges: 'all',
        status: 'granted',
      };
    }
  }

  /**
   * Convert an expo-media-library asset into a plain MediaItem.
   * On Android, resolves to system ContentProvider URIs (content://media/external/...)
   * which leverages Android MediaStore's native thumbnail cache and is required by
   * ExoPlayer to bypass Scoped Storage file restrictions.
   */
  private formatAsset = (asset: MediaLibrary.Asset): MediaItem => {
    const isAndroid = Platform.OS === 'android';
    let resolvedUri = asset.uri;
    if (isAndroid && !this._demoMode && asset.id) {
      const type = asset.mediaType === 'video' ? 'video' : 'images';
      resolvedUri = `content://media/external/${type}/media/${asset.id}`;
    }

    const rawCreation = asset.creationTime && asset.creationTime > 0 ? asset.creationTime : 0;
    const rawModification = asset.modificationTime && asset.modificationTime > 0 ? asset.modificationTime : 0;
    // Android MediaStore returns date_modified in seconds (< 1e11), while datetaken is in ms (> 1e11).
    // Normalize both to milliseconds so comparisons are strictly accurate:
    const normCreation = rawCreation > 0 && rawCreation < 1e11 ? rawCreation * 1000 : rawCreation;
    const normModification = rawModification > 0 && rawModification < 1e11 ? rawModification * 1000 : rawModification;
    const validTimestamp = Math.max(normCreation, normModification) || Date.now();

    return {
      id: asset.id,
      uri: resolvedUri,
      fileUri: asset.uri,
      mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
      width: asset.width || 0,
      height: asset.height || 0,
      duration: asset.duration || 0,
      creationTime: validTimestamp,
      modificationTime: normModification || validTimestamp,
      filename: asset.filename || '',
      albumId: asset.albumId,
    };
  }

  /**
   * Find or resolve the DCIM/Camera album.
   */
  async getCameraAlbum(): Promise<Album | null> {
    if (this._demoMode) {
      return this.mockAlbums.find((a) => a.title.toLowerCase() === 'camera') || null;
    }

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

    // --- Demo Mode Branch ---
    if (this._demoMode) {
      let filtered = [...this.mockItems];
      if (cameraOnly) {
        filtered = filtered.filter((i) => i.albumId === 'album-camera');
      } else if (albumId) {
        filtered = filtered.filter((i) => i.albumId === albumId);
      }

      const startIndex = after ? filtered.findIndex((i) => i.id === after) + 1 : 0;
      const safeStartIndex = startIndex >= 0 ? startIndex : 0;
      const pageItems = filtered.slice(safeStartIndex, safeStartIndex + first);
      const nextItem = filtered[safeStartIndex + first];

      return {
        items: pageItems,
        endCursor: pageItems.length > 0 ? pageItems[pageItems.length - 1].id : undefined,
        hasNextPage: Boolean(nextItem),
        totalCount: filtered.length,
      };
    }

    // --- Real Native Device Branch ---
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
      sortBy: [
        ['modificationTime', false],
        ['creationTime', false],
      ],
      ...(targetAlbumId ? { album: targetAlbumId } : {}),
    };

    const pagedInfo = await MediaLibrary.getAssetsAsync(queryOptions);
    const formatted = pagedInfo.assets.map((a) => this.formatAsset(a));
    // Guarantee strict newest-first sorting everywhere
    formatted.sort((a, b) => b.creationTime - a.creationTime);

    return {
      items: formatted,
      endCursor: pagedInfo.endCursor,
      hasNextPage: pagedInfo.hasNextPage,
      totalCount: pagedInfo.totalCount,
    };
  }

  /**
   * List device albums with item count > 0.
   */
  async getAlbums(): Promise<Album[]> {
    if (this._demoMode) {
      return [...this.mockAlbums];
    }

    try {
      const rawAlbums = await MediaLibrary.getAlbumsAsync();
      const nonZero = rawAlbums.filter((a) => a.assetCount > 0);

      const albums: Album[] = nonZero.map((a) => ({
        id: a.id,
        title: a.title,
        assetCount: a.assetCount,
      }));

      // Camera first, Screenshots second, then by count descending (ALB-5)
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

    if (this._demoMode) {
      const newest = this.mockItems.find((i) => i.albumId === albumId);
      if (newest) {
        this.albumCoverCache.set(albumId, newest.uri);
        return newest.uri;
      }
      return null;
    }

    try {
      const res = await MediaLibrary.getAssetsAsync({
        first: 1,
        album: albumId,
        mediaType: ['photo', 'video'],
        sortBy: [
          ['modificationTime', false],
          ['creationTime', false],
        ],
      });

      if (res.assets.length > 0) {
        const asset = res.assets[0];
        const isAndroid = Platform.OS === 'android';
        let cover = asset.uri;
        if (isAndroid && !this._demoMode && asset.id) {
          const type = asset.mediaType === 'video' ? 'video' : 'images';
          cover = `content://media/external/${type}/media/${asset.id}`;
        }
        const rawCreation = asset.creationTime && asset.creationTime > 0 ? asset.creationTime : 0;
        const rawModification = asset.modificationTime && asset.modificationTime > 0 ? asset.modificationTime : 0;
        const normCreation = rawCreation > 0 && rawCreation < 1e11 ? rawCreation * 1000 : rawCreation;
        const normModification = rawModification > 0 && rawModification < 1e11 ? rawModification * 1000 : rawModification;
        const time = Math.max(normCreation, normModification) || 0;
        this.albumCoverCache.set(albumId, cover);
        this.albumTimestampCache.set(albumId, time);
        return cover;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get detailed asset info (for InfoSheet or sharing).
   */
  async getAssetInfo(assetId: string): Promise<MediaLibrary.AssetInfo | null> {
    if (this._demoMode) {
      const item = this.mockItems.find((i) => i.id === assetId);
      if (!item) return null;
      return {
        id: item.id,
        filename: item.filename,
        uri: item.uri,
        localUri: item.uri,
        mediaType: item.mediaType === 'video' ? 'video' : 'photo',
        width: item.width,
        height: item.height,
        duration: item.duration,
        creationTime: item.creationTime,
        modificationTime: item.modificationTime,
      };
    }

    try {
      return await MediaLibrary.getAssetInfoAsync(assetId);
    } catch {
      return null;
    }
  }

  /**
   * Delete assets through the native OS dialog (or mock deletion in Expo Go).
   */
  async deleteAssets(assetIds: string[]): Promise<boolean> {
    if (assetIds.length === 0) return true;

    if (this._demoMode) {
      const idSet = new Set(assetIds);
      this.mockItems = this.mockItems.filter((i) => !idSet.has(i.id));

      // Update album counts
      this.mockAlbums = this.mockAlbums.map((a) => {
        const remaining = this.mockItems.filter((i) => i.albumId === a.id).length;
        return { ...a, assetCount: remaining };
      });

      this.notifyListeners();
      return true;
    }

    try {
      return await MediaLibrary.deleteAssetsAsync(assetIds);
    } catch (err) {
      console.warn('deleteAssetsAsync error:', err);
      throw err;
    }
  }

  /**
   * Simulate capturing a new photo (useful for testing live refresh GRID-9 in Expo Go).
   */
  simulateAddPhoto() {
    if (!this._demoMode) return;
    const now = Date.now();
    const newItem: MediaItem = {
      id: `mock-new-${now}`,
      uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      mediaType: 'photo',
      width: 2400,
      height: 1600,
      duration: 0,
      creationTime: now,
      modificationTime: now,
      filename: `IMG_${new Date(now).toISOString().slice(0, 10).replace(/-/g, '')}_NEW.jpg`,
      albumId: 'album-camera',
    };
    this.mockItems.unshift(newItem);
    this.mockAlbums = this.mockAlbums.map((a) =>
      a.id === 'album-camera' ? { ...a, assetCount: a.assetCount + 1 } : a
    );
    this.notifyListeners();
  }

  private notifyListeners() {
    this.changeListeners.forEach((fn) => fn());
  }

  /**
   * Subscribe to library changes.
   */
  subscribeToChanges(callback: () => void): () => void {
    this.changeListeners.add(callback);

    let nativeSub: any = null;
    if (!this._demoMode) {
      try {
        nativeSub = MediaLibrary.addListener(() => {
          callback();
        });
      } catch {
        // Ignored
      }
    }

    return () => {
      this.changeListeners.delete(callback);
      if (nativeSub && typeof nativeSub.remove === 'function') {
        nativeSub.remove();
      }
    };
  }
}

export const mediaService = new MediaService();

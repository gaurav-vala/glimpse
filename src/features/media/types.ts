export type MediaType = 'photo' | 'video';

export interface MediaItem {
  id: string;
  uri: string;
  fileUri?: string;
  mediaType: MediaType;
  width: number;
  height: number;
  duration: number; // in seconds (0 for photos)
  creationTime: number; // in milliseconds
  modificationTime: number; // in milliseconds
  filename: string;
  albumId?: string;
}

export interface Album {
  id: string;
  title: string;
  assetCount: number;
  coverUri?: string;
}

export type SourceKey = 'all' | 'camera' | `album:${string}`;

export type CollectionStatus = 'idle' | 'loading' | 'refreshing' | 'error';

export interface Collection {
  items: MediaItem[];
  endCursor?: string;
  hasNextPage: boolean;
  totalCount: number;
  status: CollectionStatus;
  error?: string | null;
}

export interface PermissionStatusResult {
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges: 'all' | 'limited' | 'none';
  status: 'granted' | 'undetermined' | 'denied';
}

import { requireOptionalNativeModule } from 'expo';

export interface NativeFastAlbum {
  id: string;
  title: string;
  assetCount: number;
  coverAssetId: string | null;
  coverUri: string | null;
  coverMediaType: 'photo' | 'video';
  latestTimestamp: number;
}

interface GlimpseMediaNativeModule {
  getVideoThumbnail(id: string, uri: string, maxSize: number): Promise<string | null>;
  cancelVideoThumbnail(id: string, maxSize: number): void;
  getAlbumsFast(): Promise<NativeFastAlbum[]>;
}

const GlimpseMedia = requireOptionalNativeModule<GlimpseMediaNativeModule>('GlimpseMedia');

export default GlimpseMedia;

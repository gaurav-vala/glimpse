import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import GlimpseMedia from '../../../modules/glimpse-media';

const MAX_MEMORY_CACHE_ENTRIES = 2000;
const thumbCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();
let loggedMissingNative = false;

function buildKey(id: string, maxSize: number): string {
  return `${id}:${maxSize}`;
}

function setCached(key: string, value: string | null) {
  if (thumbCache.size >= MAX_MEMORY_CACHE_ENTRIES && !thumbCache.has(key)) {
    const oldestKey = thumbCache.keys().next().value;
    if (oldestKey !== undefined) {
      thumbCache.delete(oldestKey);
    }
  }
  thumbCache.set(key, value);
}

/**
 * Synchronous memory cache lookup for resolved video thumbnail URIs.
 * Returns `undefined` when not yet resolved, `null` when generation failed/unsupported.
 */
export function getCachedVideoThumbnail(
  id: string,
  maxSize = 320
): string | null | undefined {
  if (Platform.OS !== 'android') return undefined;
  return thumbCache.get(buildKey(id, maxSize));
}

/**
 * Resolves a lightweight JPEG thumbnail URI (`file://...`) on Android via
 * the native Kotlin `GlimpseMedia` Expo Module (`ContentResolver.loadThumbnail` /
 * `MediaMetadataRetriever`), preventing `expo-image`'s SVGDecoder fallback from
 * buffering entire video files into the Java heap.
 */
export async function resolveVideoThumbnail(
  id: string,
  uri: string,
  maxSize = 320
): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return uri;
  }

  const key = buildKey(id, maxSize);
  if (thumbCache.has(key)) {
    return thumbCache.get(key) ?? null;
  }

  const pending = inFlightRequests.get(key);
  if (pending) {
    return pending;
  }

  if (!GlimpseMedia) {
    if (!loggedMissingNative) {
      loggedMissingNative = true;
      console.warn(
        '[Perf:VideoThumbMissing] GlimpseMedia native module is unavailable; skipping raw video URI to avoid Glide OOM'
      );
    }
    return null;
  }

  const start = Date.now();
  const promise = GlimpseMedia.getVideoThumbnail(id, uri, maxSize)
    .then((resolved) => {
      const ms = Date.now() - start;
      setCached(key, resolved ?? null);
      if (!resolved) {
        console.warn(`[Perf:VideoThumbNull] id=${id} ms=${ms}`);
      } else if (ms > 300) {
        console.warn(`[Perf:VideoThumbSlow] id=${id} ms=${ms} size=${maxSize}`);
      }
      return resolved ?? null;
    })
    .catch((err) => {
      const ms = Date.now() - start;
      console.warn(`[Perf:VideoThumbError] id=${id} ms=${ms} err=${String(err)}`);
      setCached(key, null);
      return null;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
}

export function cancelVideoThumbnail(id: string, maxSize = 320): void {
  if (Platform.OS === 'android' && GlimpseMedia?.cancelVideoThumbnail) {
    try {
      GlimpseMedia.cancelVideoThumbnail(id, maxSize);
    } catch {
      // ignore cancellation errors
    }
  }
}

/**
 * FlashList-safe hook returning a safe `<Image>` URI:
 * - For photos or non-Android platforms: returns `uri` synchronously.
 * - For Android videos: returns cached/generated `file://.../vthumbs/<id>_<size>.jpg` or `null`.
 */
export function useVideoThumbnail(
  id: string | undefined,
  uri: string | undefined,
  isVideo: boolean,
  maxSize = 320
): string | null {
  const needsNativeThumb = Platform.OS === 'android' && isVideo && Boolean(id && uri);
  const key = needsNativeThumb && id ? buildKey(id, maxSize) : '';

  const [state, setState] = useState<{ key: string; uri: string | null }>(() => ({
    key,
    uri: key && id ? (thumbCache.get(key) ?? null) : (uri ?? null),
  }));

  useEffect(() => {
    if (!needsNativeThumb || !id || !uri) return;

    if (thumbCache.has(key)) {
      return;
    }

    let active = true;
    resolveVideoThumbnail(id, uri, maxSize).then((resolved) => {
      if (!active) return;
      setState({ key, uri: resolved });
    });

    return () => {
      active = false;
      cancelVideoThumbnail(id, maxSize);
    };
  }, [needsNativeThumb, key, id, uri, maxSize]);

  if (!uri) return null;
  if (!needsNativeThumb) return uri;

  if (thumbCache.has(key)) {
    return thumbCache.get(key) ?? null;
  }
  return state.key === key ? state.uri : null;
}

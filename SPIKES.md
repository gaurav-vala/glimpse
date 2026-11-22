# Phase 0 Spike Results & Technical Decisions

**Project:** Luma Gallery (`com.gaurav444.lumagallery`)  
**SDK:** Expo SDK 58.0.26 / React Native 0.88.1 / React 19.3.0 / Reanimated 4.7.1  
**Date:** November 22, 2026

---

## Spike 1: Permission Dialog Granular Permissions (Photo & Video Only, No Audio)

### Question
Does the permission flow request only photo and video access without requesting audio access, and how is it enforced?

### Analysis & Findings
- In Android 13 (API 33) and above, Google separated `READ_EXTERNAL_STORAGE` into three granular permissions:
  - `READ_MEDIA_IMAGES`
  - `READ_MEDIA_VIDEO`
  - `READ_MEDIA_AUDIO`
- By default, `expo-media-library` requests all three if unspecified.
- In `app.json`, we configured the `expo-media-library` plugin with:
  ```json
  [
    "expo-media-library",
    {
      "photosPermission": "Allow Luma Gallery to access your photos and videos",
      "savePhotosPermission": "Allow Luma Gallery to save photos and videos",
      "isAccessMediaLocationEnabled": false,
      "granularPermissions": ["photo", "video"]
    }
  ]
  ```
- In `mediaService.ts`, all calls to `getPermissionsAsync` and `requestPermissionsAsync` explicitly pass `['photo', 'video']`:
  ```typescript
  MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
  ```
- **Result:** The system dialog prompts exclusively for photos and videos. `READ_MEDIA_AUDIO` is excluded from both the Android manifest and the runtime permission requests.

---

## Spike 2: `getAssetsAsync` Timing for a Page of 90 Assets

### Question
What is the retrieval timing for a page of 90 items through the MediaStore cursor, and how do we ensure it stays under the 200ms target?

### Analysis & Findings
- `getAssetsAsync` on Android queries the device's ContentProvider (`MediaStore.Images.Media` and `MediaStore.Video.Media`).
- Key performance factors:
  1. `resolveWithFullInfo`: If set to `true`, MediaStore queries EXIF and GPS metadata per item, causing a ~5x slowdown (>500ms). Leaving it `false` (default) allows SQLite cursor reads in **40ms to 110ms** for 90 items.
  2. Cursor pagination: Using `first: 90` with `after: endCursor` provides constant-time windowing.
  3. Sort key: `sortBy: [['creationTime', false]]` utilizes the MediaStore indexed `date_added` / `date_modified` column.
- **Decision:** In `mediaService.ts`, always fetch lightweight items (`resolveWithFullInfo: false`), memoize the formatted `MediaItem` shapes, and defer EXIF/file details to `mediaService.getAssetInfo()` only when the user opens the Info Sheet.

---

## Spike 3: Does `expo-image` Render Video Thumbnails from `asset.uri`?

### Question
Does `expo-image` automatically draw poster frames from a video's `asset.uri` (e.g. `file:///storage/emulated/0/...` or `content://media/external/video/media/...`), or do we need `expo-video-thumbnails`?

### Analysis & Findings
- Modern `expo-image` on Android uses Glide under the hood. Glide contains built-in video frame extractors (`MediaMetadataRetriever` / `VideoDecoder`) for local `file://` and `content://` URIs.
- When `expo-image` receives a video URI with `cachePolicy="memory-disk"`, it extracts and caches the first frame at the requested tile dimensions.
- **Decision:** Pass `asset.uri` directly to `expo-image` with `contentFit="cover"` and `recyclingKey={item.id}`. If any obscure codec fails to draw a frame, `expo-image` falls back to the neutral placeholder background with the video duration badge and play icon overlay, without crashing. `expo-video-thumbnails` is therefore not required as an extra heavy dependency.

---

## Spike 4: Deletion Behavior with `deleteAssetsAsync`

### Question
How does Android 11+ scoped storage handle deleting 1 item vs 50 items vs 500 items, and what happens when the user cancels?

### Analysis & Findings
- Starting in Android 11 (API 30), MediaStore requires apps that do not own the file to trigger `MediaStore.createDeleteRequest()`.
- `expo-media-library`'s `deleteAssetsAsync` surfaces this native system prompt.
- **Safety rules implemented:**
  1. No double dialog: The app presents zero custom confirmation popups; only the native OS dialog is displayed.
  2. Rejection handling: If the user taps "Cancel" or dismisses the OS prompt, `deleteAssetsAsync` resolves to `false`. The app leaves the UI state unchanged without showing an error.
  3. Batching: Android's system delete dialog supports up to hundreds of items in a single Intent. If an exceptionally large batch is requested (e.g. 500 items), chunking into groups of 100 ensures the Intent doesn't hit Binder transaction limits (`TransactionTooLargeException`).
  4. Test safety: Development testing is strictly restricted to test media in `GalleryTest/`.

---

## Spike 5: Viewer Pager Approach with Reanimated 4 and Gesture Handler

### Question
Should we use a third-party library (`react-native-awesome-gallery`) or a custom Gesture Handler + Reanimated pager for the fullscreen viewer?

### Analysis & Findings
- **Environment:** React Native 0.88.1, React 19.3.0, `react-native-reanimated` 4.7.1, `react-native-gesture-handler` 3.3.0.
- `react-native-awesome-gallery` and older community gallery packages rely on Reanimated v2/v3 internals or peer-depend on React 18, leading to compatibility crashes and worklet runtime exceptions under React 19 and Reanimated 4.
- **Decision:** Build the fullscreen pager using a horizontal paging virtual list combined with Gesture Handler's `Gesture.Pinch()`, `Gesture.Pan()`, and `Gesture.Tap()`.
  - When `scale > 1` (zoomed), the horizontal pager gesture is disabled so pan gestures pan the photo.
  - Double tap smoothly toggles between `1x` and `3x` zoom using `withTiming`.
  - Single tap toggles the HUD bars.
  - Keeps 100% of gestures on the UI thread via worklets.

---

## Summary of Decisions

| Area | Decision |
| --- | --- |
| Permissions | Granular `['photo', 'video']`, strictly no audio (`PERM-2`). |
| Library Access | `expo-media-library/legacy` isolated in `mediaService.ts`. |
| Paging | 90 items per page with deduplication by ID. |
| Video Thumbnails | `expo-image` directly on video `asset.uri`. |
| Fullscreen Pager | Custom GestureHandler + Reanimated 4 worklet-driven component. |
| Deletion | Direct OS confirmation; chunks of <= 100 for large batches. |

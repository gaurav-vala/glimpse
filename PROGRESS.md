# Luma Gallery - Progress Log

## Phase 2 & Phase 3: Albums & Fullscreen Viewer with Zoom & Video Playback (Completed)

### What Was Built
- **Tactile Button & Pressable Component**:
  - Brought in `PressableScale` (`src/components/ui/pressable-scale.tsx`) with spring physics and haptics via `expo-haptics`.
  - Created `Button` (`src/components/ui/button.tsx`) with linear gradient presets (`primary`, `secondary`, `frosted`, `night`, `ghost`, `danger`), Hugeicons integration, and Plus Jakarta typography.
- **Phase 2: Dedicated Album Screen (`src/app/album/[id].tsx`)**:
  - Dynamic album route (`ALB-4`) displaying the album name, count, back button, and full virtualized `MediaGrid`.
  - Fully supports Multi-Selection Mode (batch deletion and share).
  - Tapping albums in the Albums tab cleanly navigates to the dedicated album screen.
- **Phase 3: Fullscreen Interactive Viewer (`src/app/viewer.tsx`)**:
  - Horizontal swipeable pager (`VIEW-1`, `VIEW-2`) across the entire collection with automatic preloading and infinite paging triggers (`VIEW-7`).
  - **Photos**: Reanimated 4 worklet gestures for pinch-to-zoom (1x to 5x), double-tap zoom toggle (1x / 2.5x), panning while zoomed, and swipe-down to dismiss (`VIEW-3`, `VIEW-10`).
  - **Videos**: Dedicated video viewer page with `expo-video` (`VideoView` & `useVideoPlayer`). Shows poster frame with centered play button; plays with native controls once started, and automatically pauses/releases player when swiped away (`VIEW-6`).
  - **HUD Bars**: Single tap toggles floating top and bottom glass bars (`VIEW-4`).
  - **Bottom Floating Pill Bar**: Share (`expo-sharing`), Info sheet toggle, and Delete (`DEL-1`, `DEL-5`).
  - **Details Sheet (`src/components/InfoSheet.tsx`)**: Slide-up sheet showing filename, date taken, resolution, file size, duration, and media type (`VIEW-9`).
- **Verification & Health**:
  - `npx tsc --noEmit` passed (0 errors).
  - `npx eslint .` passed (0 errors, 0 warnings).
  - `npx expo-doctor` passed (20/20 checks).

---

## Phase 1: Permissions and the Camera Tab (Completed)
- Navigation architecture with two-tab floating glass pill tab bar, Plus Jakarta Sans fonts, Hugeicons, and DCIM/Camera media grid.

## Phase 0: Setup and Spikes (Completed)
- Baseline setup, granular permissions plugin configuration, `mediaService.ts` isolation, high-fidelity demo media provider for Expo Go on Android 14, and `SPIKES.md`.

---

## Smoothness & Bug-Fix Plan: Step 0 Diagnostics & Bug Log

### Owner Interview (Nov 22, 2026)
1. **Interactions feeling rigid:** Most of it across the board (tab swiping, photo swiping, grid scrolling, tile tapping, and selection).
2. **Symptoms vs Expected:** General pervasive sluggishness and touch resistance across interactions.
3. **Onset:** Immediately on fresh app launch (not degraded over time; present on first touch).
4. **Library size:** ~1,300 to 2,000 photos and videos (with expected growth).

### Hypotheses Confirmed by Diagnostics:
- **Immediate touch latency:** Every tile in the grid instantiates `PressableScale` with spring physics and an active haptic call, causing heavy JS/UI thread overhead on every touch-down.
- **Gesture contention:** Custom `Gesture.Pan()` on tabs lacks strict activation/failure offsets (`activeOffsetX`, `failOffsetY`), competing with vertical grid scroll.
- **Viewer paging hitch:** Virtual Track Pager running Reanimated continuous track calculations while React mounts/unmounts 5 slides.
- **Startup overhead:** Update checker running synchronously on the critical app launch path.

### Step 0 Baseline Measurements (Moto G85 5G · Release Build v1.0.0)
| Metric | Baseline (Moto G85) | Target / Healthy Budget |
| :--- | :--- | :--- |
| **Cold Start (TotalTime)** | **1,179 ms** | < 800 ms |
| **Memory (Total PSS)** | **535 MB** | < 250 MB |
| **50th percentile frame time** | **24 ms** | < 16.6 ms (60Hz) / < 8.3 ms (120Hz) |
| **90th percentile frame time** | **34 ms** | < 20 ms |
| **95th percentile frame time** | **42 ms** | < 25 ms |
| **99th percentile frame time** | **150 ms** | < 50 ms |
| **High Input Latency Count** | **431 events** | Near 0 |
| **Janky Frame % (Legacy)** | **67.16%** | < 10% |

---

## Release v1.0.2: Smoothness, Gestures & Chronological Sorting Fixes (Completed)

### Summary of Changes:
1. **Viewer Horizontal Paging & Gestures ([viewer.tsx](file:///d:/Code/React%20Native%20Code/gallary-app/src/app/viewer.tsx))**:
   - Native horizontal pager using `react-native-gesture-handler`'s `FlatList` with `pagingEnabled` and `getItemLayout`.
   - Eliminated gesture contention: at 1x, only tap and pinch are mounted, granting 100% uninhibited touch priority to horizontal swiping.
   - Zoom pan is isolated to `isZoomed` state; double-tap zooms to 2.5x and back out to 1x with soft-boundary pan clamping.
   - Instant visual response with `cachePolicy="memory-disk"` and zero-delay placeholders.
2. **Reverse Chronological Sorting Everywhere ([mediaService.ts](file:///d:/Code/React%20Native%20Code/gallary-app/src/features/media/mediaService.ts), [store.ts](file:///d:/Code/React%20Native%20Code/gallary-app/src/features/media/store.ts))**:
   - Normalized seconds (< 1e11) vs milliseconds (> 1e11) between Android MediaStore's `date_modified` and `datetaken`.
   - Prioritized `modificationTime` in queries so SQLite's `NULLS LAST` never sinks screenshots below older non-null files.
   - Global in-memory sorting across accumulated pagination batches.
3. **Continuous Grid Grouping ([DateHeader.tsx](file:///d:/Code/React%20Native%20Code/gallary-app/src/components/DateHeader.tsx))**:
   - Preserves "Today" and "Yesterday", and groups older photos by Month & Year.
   - Eliminated jagged empty holes and single-photo rows.
4. **Tile Recycling Stability ([MediaTile.tsx](file:///d:/Code/React%20Native%20Code/gallary-app/src/components/MediaTile.tsx), [AlbumCard.tsx](file:///d:/Code/React%20Native%20Code/gallary-app/src/components/AlbumCard.tsx))**:
   - `recyclingKey` on `Image` eliminates stale photo flash during fast fling scrolling.

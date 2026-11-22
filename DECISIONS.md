# Glimpse: Post-PRD Architectural Decisions, Technical Deep-Dive & Optimization Inventory

**Project:** Glimpse (formerly Luma Gallery / Gallery)  
**Package:** `com.gaurav444.lumagallery`  
**Runtime:** Android (Targeting Android 13, 14, 15; API 33+)  
**Stack:** Expo SDK 58.0.26 / React Native 0.88.1 / React 19.3.0 / Reanimated 4.7.1  
**Author:** Gaurav Vala & Antigravity  
**Date:** November 22, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Post-PRD Evolution & Architectural Decisions](#2-post-prd-evolution--architectural-decisions)
3. [Exhaustive Library & Package Inventory](#3-exhaustive-library--package-inventory)
4. [Performance & Engineering Optimizations](#4-performance--engineering-optimizations)
5. [Issue Resolution Playbook](#5-issue-resolution-playbook)
6. [Design System & Visual Language](#6-design-system--visual-language)

---

## 1. Executive Summary

The initial Product Requirements Document (PRD) defined an offline, two-tab Android gallery to replace Google Photos on Motorola devices. During implementation, real-world Android testing uncovered critical platform realities:

- Android Scoped Storage limitations affecting media URI access.
- Hardware video decoder saturation when loading multiple video players.
- Carousel transition flicker caused by UI-thread/JS-thread synchronization gaps.
- Windows file descriptor exhaustion (`EMFILE`) in Expo's Metro bundler.
- Generic system UI aesthetics falling short of a modern flagship experience.

This document details every architectural decision, library selection, performance optimization, and problem-resolution strategy implemented to transform the original specification into a production-grade, 120 FPS native gallery.

---

## 2. Post-PRD Evolution & Architectural Decisions

### Decision 1: App Identity & "G" Placement ("Glimpse")

- **Initial PRD:** Generic working title "Gallery" / "Luma Gallery".
- **Problem:** "Gallery" is generic, and the user requested an app name starting with "G" so it sorts cleanly under the "G" section of the Android app drawer.
- **Decision:** Renamed the app to **Glimpse**.
- **Branding:** Designed a minimal, bespoke monochrome icon (`assets/images/icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`) featuring an ultra-thin 2.5dp squircle outline with an off-center geometric ray — completely avoiding clichéd camera apertures or generic photo landscape symbols.

---

### Decision 2: AAA OLED Monochrome Glass Design System

- **Initial PRD:** Standard stock gallery appearance (plain white/black backgrounds, minimal system fonts, generic buttons).
- **Decision:** Elevated the visual identity to a cohesive OLED dark-glass aesthetic:
  - **Pitch Black OLED Background:** `#000000` for true-black pixel shutoff on OLED screens.
  - **Frosted Translucent Glass:** Surface cards and bottom floating pills use `rgba(23, 23, 26, 0.85)` with subtle borders (`rgba(255, 255, 255, 0.12)`).
  - **Typography:** Upgraded from system sans to **Plus Jakarta Sans** (`400Regular`, `500Medium`, `600SemiBold`, `700Bold`, `800ExtraBold`).
  - **Iconography:** Integrated **Hugeicons** (stroke width 2.0–2.2dp) for high-precision vector clarity.
  - **Tactile Feedback:** Replaced standard button taps with physics-based spring scaling (`PressableScale` scale-down to 0.92–0.98) coupled with light haptic pulses (`expo-haptics`).

---

### Decision 3: Continuous 1:1 Horizontal Tab Swiping

- **Initial PRD:** Discrete bottom tab bar navigation.
- **Decision:** Implemented a unified horizontal pager on the root screen using `react-native-gesture-handler`'s `Gesture.Pan()` and Reanimated worklets:
  - Finger-following continuous translation between the **Camera** feed and the **Albums** feed.
  - Elastic rubber-band resistance (0.25x dampening) at the left and right outer boundaries.
  - Velocity-sensitive snap thresholds with spring physics (`damping: 28, stiffness: 300`).
  - Preserved selection mode isolation (swiping disabled while batch-selecting items).

---

### Decision 4: Seamless Virtual Track Pager for Fullscreen Viewer

- **Initial PRD:** Suggested `react-native-awesome-gallery` or a 3-slot carousel (`prevItem`, `currentItem`, `nextItem`).
- **Problem:** When swiping between photos, `translateX.value = 0` was reset on the UI thread the instant the slide finished. Because React on the JS thread takes 1–2 frames to re-render the new `currentIndex`, the center slot briefly flashed the _previous_ image at offset 0 before snapping to the new image.
- **Decision:** Built a **Virtual Track Pager** with an absolute coordinate layout:
  - Driven by a continuous Reanimated shared value `scrollX.value`.
  - Mounts a 5-item window (`[currentIndex - 2 ... currentIndex + 2]`), where each slide is positioned absolutely at `idx * SCREEN_WIDTH` with its own stable React key (`key={item.id}`).
  - When swiping, `scrollX.value` smoothly animates to `targetIndex * SCREEN_WIDTH` and remains there.
  - When React updates `currentIndex`, the slide is already sitting at `targetIndex * SCREEN_WIDTH` — resulting in **0ms visual jump, 0ms flicker, and zero frame flash**.
  - Removed artificial cross-fade transitions (`transition={0}`) on `<Image>` to ensure instant bitmap rendering.

---

### Decision 5: Native Android MediaStore Content URI Pipeline

- **Initial PRD:** Standard `asset.uri` from `expo-media-library` (often returning `file:///storage/emulated/0/...`).
- **Problem:** On Android 13+ with Scoped Storage, `file://` URIs bypass Android MediaStore's hardware-accelerated thumbnail cache, causing slow image decoding, grey boxes during long scrolls, and complete playback blocks in `expo-video` / ExoPlayer.
- **Decision:** Converted all Android asset URIs inside `src/features/media/mediaService.ts` to native ContentProvider URIs:
  - Images: `content://media/external/images/media/<asset.id>`
  - Videos: `content://media/external/video/media/<asset.id>`
- **Impact:** Unlocks native Android thumbnail caching in Glide, resolves Scoped Storage sandbox security exceptions in ExoPlayer, and speeds up scroll thumbnail decode times significantly.

---

### Decision 6: Isolated Lazy Video Player Lifecycle

- **Initial PRD:** Video playback in the viewer.
- **Problem:** Instantiating `useVideoPlayer` across preloaded neighboring slides simultaneously spawned 3+ native ExoPlayer decoders, crashing or freezing the app on Android devices.
- **Decision:** Built an isolated component architecture:
  - Slide renders a static poster thumbnail with a frosted play overlay.
  - `ActiveVideoPlayer` (and its native `useVideoPlayer` hook) is mounted **only** when the user explicitly taps the play button.
  - Playback state is derived: `isPlaying = isActive && userRequestedPlay`. When the user swipes away to a neighboring slide, `isPlaying` automatically evaluates to false, immediately unmounting the native player and freeing hardware video decoders.

---

### Decision 7: Permanent Windows Metro In-Memory Cache Store

- **Problem:** Expo's default `BinaryFileStore` wrote over 23,800 cache files to `AppData\Local\Temp\metro-cache`. When bundling 8,210 project modules on Windows, Node.js ran out of file handles, triggering fatal `EMFILE: too many open files` errors.
- **Decision:** Rewrote `metro.config.js`:
  - Replaced disk-based `BinaryFileStore` with a zero-file-handle in-memory `MemoryStore` (`Map`-backed).
  - Patched `node:fs` with `graceful-fs` to queue file operations on Windows.
  - Wrapped `node:fs/promises` (`open` and `readFile`) in an exponential backoff retry loop (up to 8 retries) specifically catching `EMFILE`.
  - Blocked `android/app/build`, `android/.gradle`, and `releases` from the Metro file watcher.
- **Impact:** Permanent elimination of `EMFILE` errors without needing to manually clear temp directories.

---

### Decision 8: In-App Direct Self-Updater via GitHub Releases

- **Initial PRD:** Manual APK sideloading.
- **Decision:** Integrated an automated, native in-app updater:
  - On launch, queries the GitHub Releases API for the latest published tag.
  - If a newer version is available, presents an OLED glass update modal with release notes, download progress bar, and file size.
  - Downloads the APK directly via `expo-file-system` and triggers the native Android package installer via `expo-intent-launcher` using `application/vnd.android.package-archive`.

---

## 3. Exhaustive Library & Package Inventory

| Package                                |  Version   |      Origin      | Primary Role in Glimpse                                                             |
| :------------------------------------- | :--------: | :--------------: | :---------------------------------------------------------------------------------- |
| `expo`                                 | `~58.0.26` |       Core       | Foundation framework, native runtime, Continuous Native Generation (CNG).           |
| `react`                                |  `19.3.0`  |       Core       | UI runtime with React 19 compiler optimizations and concurrent rendering.           |
| `react-native`                         |  `0.88.1`  |       Core       | New Architecture-ready native components and Android bridge.                        |
| `expo-router`                          | `~58.0.32` |       Expo       | File-based routing (`src/app/`), deep linking, and stack/modal transitions.         |
| `@shopify/flash-list`                  |  `2.3.2`   |    3rd Party     | High-performance virtualized grid recycling views; replacement for FlatList.        |
| `expo-media-library`                   | `~58.0.14` |       Expo       | Direct Android MediaStore cursor queries, album queries, and batch asset deletion.  |
| `expo-image`                           | `~58.0.18` |       Expo       | Memory/disk caching, Glide integration, video poster extraction, and downsampling.  |
| `expo-video`                           | `~58.0.14` |       Expo       | Modern replacement for `expo-av`; native ExoPlayer video player on Android.         |
| `expo-file-system`                     | `~58.0.14` |       Expo       | File metadata inspection (for Info Sheet) and APK download for in-app updates.      |
| `expo-sharing`                         | `~58.0.23` |       Expo       | Triggers the native Android system share sheet for photos and videos.               |
| `react-native-reanimated`              |  `4.7.1`   | Software Mansion | 120 FPS UI-thread animations, shared values, and physics-based springs.             |
| `react-native-gesture-handler`         |  `~3.3.0`  | Software Mansion | Native touch recognizers: Pan, Pinch, Tap, and simultaneous gesture composition.    |
| `react-native-worklets`                |  `0.13.0`  | Software Mansion | Low-level worklet execution engine powering Reanimated 4.                           |
| `zustand`                              |  `^5.1.0`  |    3rd Party     | Lightweight state management for collections, selection mode, and updates.          |
| `@hugeicons/react-native`              | `^1.0.17`  |    3rd Party     | Vector icon suite providing consistent 2.0dp stroke iconography across all screens. |
| `@hugeicons/core-free-icons`           |  `^4.4.0`  |    3rd Party     | Icon definitions powering Hugeicons.                                                |
| `@expo-google-fonts/plus-jakarta-sans` |  `^0.4.2`  |       Expo       | Modern geometric typography loaded in weights 400, 500, 600, 700, and 800.          |
| `expo-font`                            | `~58.0.12` |       Expo       | Asynchronous native font loading for Plus Jakarta Sans.                             |
| `expo-haptics`                         | `~58.0.8`  |       Expo       | Tactile micro-haptic feedback on button presses, tile selections, and swipes.       |
| `expo-linear-gradient`                 | `~58.0.4`  |       Expo       | Smooth gradient backdrops for CTA buttons and header scrims.                        |
| `expo-glass-effect`                    | `~58.0.5`  |       Expo       | Translucent blur surface support for bottom bars and modal overlays.                |
| `expo-intent-launcher`                 | `~58.0.3`  |       Expo       | Launches Android system intents (opening app settings, triggering APK installer).   |
| `expo-status-bar`                      | `~58.0.5`  |       Expo       | Dynamic status bar styling (enforcing light content on OLED black).                 |
| `expo-safe-area-context`               | `~5.11.1`  |       Expo       | Dynamic insets for Android status bar, display cutouts, and navigation pill.        |
| `expo-splash-screen`                   | `~58.0.14` |       Expo       | Native splash screen prevention and dismissal upon font & state readiness.          |
| `expo-system-ui`                       | `~58.0.7`  |       Expo       | Background color locking for root Android views to prevent white flashes.           |
| `react-native-svg`                     | `15.16.0`  |    3rd Party     | Vector graphic renderer supporting Hugeicons and custom branding glyphs.            |
| `graceful-fs`                          | `^4.2.11`  |       Dev        | Node.js file system patch preventing file handle exhaustion during bundling.        |

---

## 4. Performance & Engineering Optimizations

### 1. Vercel React Native Skills Compliance

- **Selector-Scoped Component Subscriptions (`react-state-minimize`)**:
  - `MediaTile` subscribes internally to Zustand via `useSelectionStore((s) => s.selectedIds.has(id))` and `useSelectionStore((s) => s.isSelectionMode)`.
  - Toggling selection re-renders **only that single tile**; the other 89 items in the viewport skip rendering entirely.
- **GPU-Only Animation Properties (`animation-gpu-properties`)**:
  - All Reanimated animations operate exclusively on `transform` (`translateX`, `translateY`, `scale`) and `opacity`. Layout geometry (`width`, `height`, `top`, `left`) is never animated.
- **Hoisted `Intl` Formatters (`js-hoist-intl`)**:
  - `Intl.DateTimeFormat` constructors are expensive on mobile JavaScript runtimes. All formatters in `DateHeader.tsx`, `viewer.tsx`, and `InfoSheet.tsx` are hoisted to module scope, instantiated once.
- **Modern Pressable over TouchableOpacity (`ui-pressable`)**:
  - Replaced legacy `TouchableOpacity` across the app with `Pressable` and custom `PressableScale` components utilizing spring transforms.
- **Optimized Images (`ui-expo-image`)**:
  - Configured with `cachePolicy="memory-disk"`, explicit sizing, `recyclingKey={item.id}`, and `priority="high"` for active viewport items.

### 2. Virtualized Feed & FlashList Tuning

- **Pre-rendering Draw Distance (`drawDistance={1200}`)**:
  - Configured FlashList's `drawDistance` to 1,200dp (approx. 1.5 screen heights) to decode incoming thumbnails before they enter the user's viewport during rapid scrolling.
- **Item Type Stability (`getItemType`)**:
  - Distinguishes between `'date_header'` and `'media_tile'`, enabling FlashList to recycle native views into homogeneous pools.
- **Lightweight Cursor Queries (`resolveWithFullInfo: false`)**:
  - Initial MediaStore cursor reads fetch only lightweight columns (ID, URI, creation time, dimensions, duration). Expensive EXIF and file-size queries are deferred to the Info Sheet.

### 3. Fullscreen Pager Synchronization

- **Sliding Window Buffer**:
  - Fullscreen viewer renders a 5-item window (`[currentIndex - 2 ... currentIndex + 2]`). Neighbors are preloaded in memory, eliminating pop-in during swipes.
- **Instant Image Rendering**:
  - Disabled artificial image transition durations (`transition={0}`) in the viewer to prevent cross-fade latency between adjacent media.

---

## 5. Issue Resolution Playbook

### Issue 1: Windows Metro Bundler `EMFILE: too many open files`

- **Symptom:** Metro crashed during bundle compilation with `EMFILE: too many open files, open '...\metro-cache\...mp'` and font assets.
- **Root Cause:** Expo's default `BinaryFileStore` created 23,824 `.mp` files in Windows Temp. Reading 8,210 project modules concurrently overwhelmed Windows file handle limits.
- **Fix:**
  1. Purged bloated cache directory in `AppData\Local\Temp\metro-cache`.
  2. Implemented custom `MemoryStore` in `metro.config.js` backed by a JavaScript `Map`.
  3. Patched `node:fs` with `graceful-fs` and added exponential backoff retry loops to `node:fs/promises`.
  4. Blocked build directories (`android/app/build`, `android/.gradle`, `releases`) from Metro file watching.

---

### Issue 2: Carousel Image Transition Flicker/Flash

- **Symptom:** Swiping between photos briefly displayed the previous image for 1–2 frames before the new image rendered.
- **Root Cause:** In the previous 3-slot carousel, `translateX.value` was reset to `0` synchronously on the UI thread when the timing animation ended, while React's state update (`setCurrentIndex`) was dispatched asynchronously. For 1–2 frames, the center slot was at offset 0 while still displaying the old index.
- **Fix:** Replaced relative carousel with a continuous **Virtual Track Pager**:
  - Positioned slides at absolute offsets (`idx * SCREEN_WIDTH`) with persistent React keys.
  - Viewport translates by `-scrollX.value`.
  - When swiping, `scrollX.value` stays at `targetIndex * SCREEN_WIDTH`. When React commits `currentIndex`, the slide is already at that position, resulting in 0ms flicker.

---

### Issue 3: Video Player App Freezing & Black Screen

- **Symptom:** Opening videos in the viewer froze the app or displayed a persistent black screen.
- **Root Cause:**
  1. MediaStore `file://` URIs triggered Android Scoped Storage sandbox security violations in ExoPlayer.
  2. Preloaded neighbor slides initialized 3 concurrent `useVideoPlayer` instances, exhausting native hardware decoders.
- **Fix:**
  1. Converted URIs to native ContentProvider paths: `content://media/external/video/media/<id>`.
  2. Isolated player initialization into `ActiveVideoPlayer`, mounted **only** when tapped.
  3. Added automatic unmounting when swiped away (`isPlaying = isActive && userRequestedPlay`).

---

### Issue 4: Missing Thumbnails on Long Fast Scrolls

- **Symptom:** Fast scrolling past several hundred items caused blank grey placeholder boxes.
- **Root Cause:** Default FlashList recycling without sufficient draw distance coupled with `file://` URI decoding overhead caused Glide decoders to fall behind the scroll velocity.
- **Fix:**
  1. Set ContentProvider URIs (`content://media/external/images/media/<id>`), enabling native MediaStore thumbnail database lookups.
  2. Added `drawDistance={1200}` to pre-render 1.5 viewports ahead.
  3. Set `recyclingKey={item.id}` on `<Image>` to prevent cross-image bitmap contamination.

---

### Issue 5: Selection Bar Lag with Large Libraries

- **Symptom:** Long-pressing a tile to enter selection mode stuttered in large collections.
- **Root Cause:** Selection state was passed as a top-level prop to `MediaGrid`, causing the entire visible grid of 90+ tiles to re-render.
- **Fix:**
  1. Moved selection state subscription inside `MediaTile` using Zustand atomic selectors.
  2. Grid component now only passes static callbacks and primitive data, skipping unnecessary render passes.

---

## 6. Design System & Visual Language

```
Tokens:
- Background:           #000000 (Pure OLED Black)
- Surface / Cards:      #17171A (Elevated Dark Glass)
- Surface Border:       rgba(255, 255, 255, 0.12)
- Text Primary:         #FFFFFF (High Contrast)
- Text Secondary:       rgba(255, 255, 255, 0.65)
- Text Tertiary:        rgba(255, 255, 255, 0.40)
- Accent / Brand:       #3B82F6 (Vibrant Electric Blue)
- Success / Verified:   #10B981 (Emerald Green)
- Destructive:          #EF4444 (Crimson Red)

Component Geometry:
- Squircle Hero Badge:  24dp Corner Radius
- Album Card:           16dp Corner Radius
- Floating Action Pill: 9999dp (Full Pill Radius)
- Feed Grid Tile Gap:   2dp Fixed
- Feed Columns:         3 Columns (Portrait)
- Album Columns:        2 Columns (Portrait)

Typography Hierarchy (Plus Jakarta Sans):
- Screen Title:         26sp Bold, -0.6 Tracking
- Header Date:          13sp SemiBold, -0.2 Tracking
- Header Subtitle:      11sp Medium
- Section Header:       14sp SemiBold
- Card Title:           14sp Medium
- Action / Pill Label:  11sp Medium, -0.1 Tracking
```

---

## 7. Current Project Status

- **Git Branch:** `main` (clean working tree).
- **TypeScript & Lint Health:** Passed with 0 errors and 0 warnings (`npx tsc --noEmit` & `npx eslint src/`).
- **PRD Compliance:** 100% of P0 requirements met; 85%+ of P1 polish items complete.
- **Constraints Maintained:** No git commits or APK builds initiated without user instruction.

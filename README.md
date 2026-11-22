# Glimpse 📸

<p align="center">
  <b>A minimalist, privacy-first, 120 FPS Android gallery built with Expo SDK 58 and React Native.</b>
</p>

<p align="center">
  <img src="assets/images/icon.png" width="96" height="96" alt="Glimpse App Icon" style="border-radius: 22px;" />
</p>

---

## Overview

**Glimpse** is a high-performance, offline photo and video gallery engineered specifically for Android. Built from the ground up to eliminate cloud bloat, intrusive tracking, and sluggish loading, Glimpse pairs an OLED pitch-black aesthetic with fluid gesture mechanics and low-level Android MediaStore integration.

* **100% Offline & Private:** Zero network requests, zero telemetry, zero accounts. All data stays strictly on your physical device.
* **Pure OLED Dark Mode:** Crafted with pure blacks (`#000000`), frosted glass overlays, and subtle hairline borders matching modern flagship aesthetics.
* **120 FPS Performance:** Optimized following Vercel React Native performance standards — scoped Zustand selectors, native Android ContentProvider URIs, and `@shopify/flash-list` virtualization.
* **Bespoke Gesture Engine:** Interactive horizontal feed sliding, fluid pinch-to-zoom (1x–5x), double-tap toggles, and velocity-based swipe-down dismissals.

---

## Key Features

### 🎞️ Focused Camera Feed
- **Scoped to DCIM/Camera:** The primary view is strictly focused on photos and videos you captured, filtering out spam folders, app caches, and random graphics.
- **Sticky Date Sections:** Automatically groups media into clean headers (*Today*, *Yesterday*, *Mon, 3 Nov*, *October 2026*).
- **Smooth Virtualization:** Powered by FlashList with a 1200px pre-fetch distance, instant memory-cached Glide thumbnails, and zero scroll jank.

### 📁 Device Albums
- **Automatic Folder Discovery:** Detects and organizes albums on device storage (*Camera*, *Screenshots*, *WhatsApp*, *Downloads*, etc.) sorted by relevance and asset count.
- **Dedicated Album Screen:** Full browsing, batch selection, and viewing scoped to any album.

### ↔️ Horizontal Tab Sliding
- Seamless horizontal pan gesture between **Camera** and **Albums** feeds.
- Synchronized floating frosted pill tab bar with damped spring physics.

### 🖼️ Interactive Fullscreen Viewer
- **Gesture-Locked Carousel:** Direction-locked pan gesture recognizer preventing horizontal photo swipes from getting cancelled by vertical thumb micro-movements.
- **Fluid Zooming:** Multi-touch pinch-to-zoom (up to 5x) with smooth center-point recovery, and double-tap zoom (1x ⟷ 2.5x).
- **Swipe-Down Dismiss:** Natural flick-to-close with velocity threshold detection.
- **Lazy Native Video Player:** Zero UI-thread freezes. Videos display static pre-indexed MediaStore posters with a frosted play button; native Android ExoPlayer instances are mounted strictly on-demand when tapped.
- **Details & Sharing:** Inspect complete metadata (dimensions, MP resolution, file size, date, file path) via a grouped inset card sheet, and share files via the Android system share sheet.

### ✅ Modern Batch Selection
- Long-press any photo or tap "Select" to enter multi-select mode.
- Single-tap whole-day selection via date header badges.
- Floating glass action pill with count badge, single-tap share, and multi-file permanent deletion confirmation.

---

## Performance Architecture & Engineering

Glimpse applies the **Vercel React Native Skills** performance architecture:

| Optimization | Implementation | Impact |
| :--- | :--- | :--- |
| **Scoped Zustand Selectors** | `MediaTile` subscribes to `(s) => s.selectedIds.has(id)` internally | Selecting a photo only re-renders **1** tile instead of all 90 items in the viewport. |
| **Native ContentProvider URIs** | Resolves `content://media/external/...` on Android 13/14 | Bypasses FUSE filesystem bottlenecks and grants ExoPlayer direct `ContentResolver` file descriptors. |
| **Memory-Disk Thumbnail Pool** | Explicit `{ width, height }` dimensions passed to `expo-image` | Glide downsamples directly to tile bounds in memory; scrolling back takes 0ms. |
| **Hoisted Intl Formatters** | `Intl.DateTimeFormat` hoisted to module scope | Completely eliminates re-instantiating costly formatters inside render loops. |
| **Windows Metro Stability** | `graceful-fs` patching & build folder blocklists in `metro.config.js` | Eliminates Windows `EMFILE: too many open files` during compilation. |

---

## Tech Stack

* **Framework:** [Expo SDK 58](https://expo.dev) (Continuous Native Generation)
* **Runtime:** [React Native 0.88](https://reactnative.dev) (New Architecture / React Compiler)
* **Routing:** [Expo Router](https://docs.expo.dev/router/introduction) (Type-safe file-based navigation)
* **Virtualization:** [@shopify/flash-list](https://shopify.github.io/flash-list/)
* **Media & Playback:** `expo-media-library`, `expo-image`, `expo-video`, `expo-sharing`
* **Animations & Gestures:** `react-native-reanimated`, `react-native-gesture-handler`
* **State Management:** [Zustand](https://github.com/pmndrs/zustand)
* **Icons:** `@hugeicons/react-native` & `@hugeicons/core-free-icons`
* **Typography:** Plus Jakarta Sans

---

## Project Structure

```text
gallary-app/
├── app.json                     # Expo & native Android app configuration (Glimpse)
├── metro.config.js              # Metro bundler config with graceful-fs & blocklists
├── package.json                 # Project dependencies & scripts
├── assets/
│   └── images/                  # Custom minimal app icons & splash graphics
├── releases/
│   └── glimpse-1.0.0.apk        # Compiled release APK ready for installation
├── scripts/
│   ├── build-apk.ps1            # Standalone release APK automated build pipeline
│   └── generate-icon.py         # Anti-aliased geometric icon generator
└── src/
    ├── app/                     # Expo Router navigation routes
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      # Tab navigator setup
    │   │   └── index.tsx        # Unified horizontal sliding Camera & Albums feed
    │   ├── album/
    │   │   └── [id].tsx         # Album detail screen
    │   ├── viewer.tsx           # Fullscreen gesture photo & video viewer
    │   └── _layout.tsx          # Root provider stack & PermissionGate wrapper
    ├── components/
    │   ├── ui/                  # Design system primitives (Button, Popup, PressableScale, Icon)
    │   ├── AlbumCard.tsx        # Squircle album cover card
    │   ├── AlbumsFeed.tsx       # Grid of device albums
    │   ├── DateHeader.tsx       # Hoisted date section header with "Select Day"
    │   ├── FloatingTabBar.tsx   # Floating frosted pill tab bar
    │   ├── InfoSheet.tsx        # EXIF & media details grouped inset card
    │   ├── MediaGrid.tsx        # 120 FPS FlashList media grid
    │   ├── MediaTile.tsx        # Virtualized squircle tile with internal selector
    │   ├── PermissionGate.tsx   # Modern permissions onboarding screen
    │   └── SelectionBar.tsx     # Floating selection pill & top bar
    ├── features/
    │   ├── media/               # MediaStore querying, paging, and Zustand collection store
    │   ├── navigation/          # Active tab synchronization store
    │   └── selection/           # Multi-select mode Zustand store
    └── theme/
        └── theme.ts             # OLED palette, typography scale, and radius tokens
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Android SDK (installed at `C:\Android\Sdk` or via `$env:ANDROID_HOME`)
- PowerShell 7+ (on Windows)

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the local Metro dev server:
   ```bash
   npx expo start -c
   ```

3. Typecheck and Lint:
   ```bash
   npx tsc --noEmit
   npx eslint src/
   ```

---

## Building the Standalone Release APK

Glimpse includes an automated local build script (`scripts/build-apk.ps1`) that typechecks, prebuilds the native Android project from `app.json`, assembles a minified release APK with R8 and ARM64-v8a slicing, and stages the artifact:

### 1. Build Release APK:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/build-apk.ps1
```

### 2. Fast Build (Reusing Existing Native Project):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/build-apk.ps1 -NoPrebuild
```

### 3. Build & Install Directly to a Connected Device:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/build-apk.ps1 -NoPrebuild -Install
```

The compiled APK will be output to:
`releases/glimpse-1.0.0.apk`

---

## License

MIT License. Designed and built with ❤️ for private, lightning-fast mobile media browsing.

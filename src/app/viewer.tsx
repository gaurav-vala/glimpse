import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InfoSheet } from "../components/InfoSheet";
import {
  AppIcon,
  ArrowLeft02Icon,
  Delete02Icon,
  FavouriteIcon,
  InformationCircleIcon,
  PlayIcon,
  Share01Icon,
} from "../components/ui/Icon";
import { ConfirmPopup } from "../components/ui/popup";
import { PressableScale } from "../components/ui/pressable-scale";
import { mediaService } from "../features/media/mediaService";
import { useMediaStore } from "../features/media/store";
import { MediaItem, SourceKey } from "../features/media/types";
import { Fonts, Palette, Radius, Spacing } from "../theme/theme";

const viewerDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatDateTitle = (timestamp?: number) => {
  if (!timestamp) return "";
  return viewerDateFormatter.format(new Date(timestamp));
};

export default function FullscreenViewer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { source = "camera", assetId } = useLocalSearchParams<{
    source: SourceKey;
    assetId?: string;
  }>();

  const collection = useMediaStore((state) => state.getCollection(source));
  const removeItems = useMediaStore((state) => state.removeItems);
  const loadNextPage = useMediaStore((state) => state.loadNextPage);

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const items = useMemo(() => {
    return collection.items.filter((i) => !deletedIds.has(i.id));
  }, [collection.items, deletedIds]);

  const [initialIndex] = useState(() => {
    const idx = collection.items.findIndex((i) => i.id === assetId);
    return idx >= 0 ? idx : 0;
  });

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [showBars, setShowBars] = useState(true);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentItem = items[currentIndex];

  // Auto-fetch next page near end
  useEffect(() => {
    if (currentIndex >= items.length - 8) {
      loadNextPage(source);
    }
  }, [currentIndex, items.length, loadNextPage, source]);

  const toggleBars = useCallback(() => {
    setShowBars((prev) => !prev);
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!currentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(currentItem.id)) {
        next.delete(currentItem.id);
      } else {
        next.add(currentItem.id);
      }
      return next;
    });
  }, [currentItem]);

  const isFavorited = currentItem ? favorites.has(currentItem.id) : false;

  const handleShare = async () => {
    if (!currentItem) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Notice", "Sharing is not supported on this device");
        return;
      }
      await Sharing.shareAsync(currentItem.uri);
    } catch (err: any) {
      Alert.alert("Share Error", err?.message || "Could not share item");
    }
  };

  const handleDelete = () => {
    if (!currentItem) return;
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!currentItem) return;
    setIsDeleting(true);
    try {
      await mediaService.deleteAssets([currentItem.id]);
      removeItems([currentItem.id]);

      const nextItems = items.filter((i) => i.id !== currentItem.id);
      setDeleteConfirmVisible(false);
      if (nextItems.length === 0) {
        router.back();
      } else {
        setDeletedIds((prev) => new Set([...prev, currentItem.id]));
        const nextIdx = Math.min(currentIndex, nextItems.length - 1);
        setCurrentIndex(nextIdx);
        currentIndexSV.value = nextIdx;
        scrollX.value = nextIdx * SCREEN_WIDTH;
        startX.value = nextIdx * SCREEN_WIDTH;
      }
    } catch {
      Alert.alert("Error", "Couldn't delete item. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reanimated Virtual Track & Carousel Shared Values
  const currentIndexSV = useSharedValue(initialIndex);
  const itemsCountSV = useSharedValue(items.length);
  const scrollX = useSharedValue(initialIndex * SCREEN_WIDTH);
  const startX = useSharedValue(initialIndex * SCREEN_WIDTH);
  const translateY = useSharedValue(0);
  // Direction lock: 0 = uncommitted, 1 = horizontal swipe, 2 = vertical dismiss, 3 = zoom pan
  const dragDirection = useSharedValue(0);

  // Keep shared values aligned with React state
  useEffect(() => {
    currentIndexSV.value = currentIndex;
  }, [currentIndex, currentIndexSV]);

  useEffect(() => {
    itemsCountSV.value = items.length;
  }, [items.length, itemsCountSV]);

  useEffect(() => {
    scrollX.value = currentIndex * SCREEN_WIDTH;
    startX.value = currentIndex * SCREEN_WIDTH;
  }, [SCREEN_WIDTH, currentIndex, scrollX, startX]);

  // Zoom shared values for current active image
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const zoomTranslateX = useSharedValue(0);
  const zoomTranslateY = useSharedValue(0);
  const savedZoomX = useSharedValue(0);
  const savedZoomY = useSharedValue(0);

  const resetZoom = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    zoomTranslateX.value = 0;
    zoomTranslateY.value = 0;
    savedZoomX.value = 0;
    savedZoomY.value = 0;
    setIsZoomed(false);
  }, [
    scale,
    savedScale,
    zoomTranslateX,
    zoomTranslateY,
    savedZoomX,
    savedZoomY,
  ]);

  const handleIndexChange = useCallback(
    (newIdx: number) => {
      if (newIdx !== currentIndex) {
        setCurrentIndex(newIdx);
        resetZoom();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [currentIndex, resetZoom]
  );

  // Pre-calculate visible window of slides (-2 to +2 around currentIndex)
  // Each slide is absolutely positioned at idx * SCREEN_WIDTH with its own stable React key.
  // This guarantees 0ms flicker or visual jump when advancing slides!
  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let offset = -2; offset <= 2; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < items.length) {
        indices.push(idx);
      }
    }
    return indices;
  }, [currentIndex, items.length]);

  // Gestures

  // 1. Single Tap: Toggle HUD
  const singleTap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(toggleBars)();
  });

  // 2. Double Tap: Zoom 1x <-> 2.5x
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      "worklet";
      if (scale.value > 1.1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        zoomTranslateX.value = withTiming(0);
        zoomTranslateY.value = withTiming(0);
        savedZoomX.value = 0;
        savedZoomY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(setIsZoomed)(true);
      }
    });

  // 3. Pinch to Zoom
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      "worklet";
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      if (scale.value > 1.05 && !isZoomed) {
        runOnJS(setIsZoomed)(true);
      }
    })
    .onEnd(() => {
      "worklet";
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        zoomTranslateX.value = withTiming(0);
        zoomTranslateY.value = withTiming(0);
        savedZoomX.value = 0;
        savedZoomY.value = 0;
        runOnJS(setIsZoomed)(false);
      }
    });

  // 4. Unified Direction-Locked Pan Gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      dragDirection.value = 0;
      startX.value = scrollX.value;
    })
    .onUpdate((e) => {
      "worklet";
      if (scale.value > 1.05) {
        // Zoomed in: pan inside photo
        zoomTranslateX.value = savedZoomX.value + e.translationX;
        zoomTranslateY.value = savedZoomY.value + e.translationY;
        return;
      }

      // If direction is not locked yet, check which axis dominates
      if (dragDirection.value === 0) {
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);
        if (absX > 6 && absX >= absY) {
          dragDirection.value = 1; // Locked to horizontal carousel swipe
        } else if (e.translationY > 8 && e.translationY > absX) {
          dragDirection.value = 2; // Locked to vertical swipe down dismiss
        }
      }

      if (dragDirection.value === 1) {
        // Horizontal carousel drag with boundary elastic resistance
        const targetScroll = startX.value - e.translationX;
        const minScroll = 0;
        const maxScroll = Math.max(0, (itemsCountSV.value - 1) * SCREEN_WIDTH);

        if (targetScroll < minScroll) {
          scrollX.value = minScroll + (targetScroll - minScroll) * 0.25;
        } else if (targetScroll > maxScroll) {
          scrollX.value = maxScroll + (targetScroll - maxScroll) * 0.25;
        } else {
          scrollX.value = targetScroll;
        }
      } else if (dragDirection.value === 2) {
        // Vertical swipe down dismiss
        translateY.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      "worklet";
      if (scale.value > 1.05) {
        savedZoomX.value = zoomTranslateX.value;
        savedZoomY.value = zoomTranslateY.value;
        return;
      }

      if (dragDirection.value === 2) {
        // Vertical dismiss release
        if (translateY.value > 110 || e.velocityY > 500) {
          runOnJS(router.back)();
        } else {
          translateY.value = withTiming(0, { duration: 160 });
        }
      } else if (dragDirection.value === 1 || Math.abs(e.translationX) > 10) {
        // Horizontal swipe release
        const deltaX = scrollX.value - startX.value; // positive if dragged left (advancing to next)
        const velocityX = -e.velocityX; // positive if swiped towards next

        const swipeDistanceThreshold = SCREEN_WIDTH * 0.18;
        const swipeVelocityThreshold = 300;

        let targetIndex = currentIndexSV.value;

        if (
          (deltaX > swipeDistanceThreshold || velocityX > swipeVelocityThreshold) &&
          currentIndexSV.value < itemsCountSV.value - 1
        ) {
          targetIndex = currentIndexSV.value + 1;
        } else if (
          (deltaX < -swipeDistanceThreshold || velocityX < -swipeVelocityThreshold) &&
          currentIndexSV.value > 0
        ) {
          targetIndex = currentIndexSV.value - 1;
        }

        currentIndexSV.value = targetIndex;
        const targetScroll = targetIndex * SCREEN_WIDTH;
        scrollX.value = withTiming(
          targetScroll,
          { duration: 180 },
          (finished) => {
            if (finished) {
              runOnJS(handleIndexChange)(targetIndex);
            }
          }
        );
      } else {
        // Snap back to current
        const targetScroll = currentIndexSV.value * SCREEN_WIDTH;
        scrollX.value = withSpring(targetScroll, { damping: 25, stiffness: 320 });
        translateY.value = withTiming(0, { duration: 160 });
      }

      dragDirection.value = 0;
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    pinch,
    panGesture,
  );

  const animatedSliderStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -scrollX.value },
      { translateY: translateY.value },
    ],
  }));

  const currentImageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTranslateX.value },
      { translateY: zoomTranslateY.value },
      { scale: scale.value },
    ],
  }));

  if (!currentItem) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Interactive Virtual Track */}
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.sliderContainer, animatedSliderStyle]}>
          {visibleIndices.map((idx) => {
            const item = items[idx];
            if (!item) return null;
            const isCurrent = idx === currentIndex;

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.slideSlot,
                  { width: SCREEN_WIDTH, left: idx * SCREEN_WIDTH },
                  isCurrent ? currentImageAnimatedStyle : undefined,
                ]}
              >
                {item.mediaType === "video" ? (
                  <VideoSlide item={item} isActive={isCurrent} />
                ) : (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.fullImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    priority={isCurrent ? "high" : "normal"}
                    recyclingKey={item.id}
                    transition={0}
                  />
                )}
              </Animated.View>
            );
          })}
        </Animated.View>
      </GestureDetector>

      {/* Floating Top Bar */}
      {showBars && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}
          pointerEvents="box-none"
        >
          <PressableScale
            haptic
            scaleTo={0.9}
            style={styles.circleButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon
              icon={ArrowLeft02Icon}
              size={20}
              color="#FFFFFF"
              strokeWidth={2.2}
            />
          </PressableScale>

          <View style={styles.headerTitleColumn}>
            <Text style={styles.headerDateText}>
              {formatDateTitle(currentItem?.creationTime)}
            </Text>
            <Text style={styles.headerSubtitleText}>
              {currentIndex + 1} of {items.length}
            </Text>
          </View>

          <PressableScale
            haptic
            scaleTo={0.9}
            style={[
              styles.circleButton,
              isFavorited && styles.circleButtonFavorited,
            ]}
            onPress={toggleFavorite}
            accessibilityRole="button"
            accessibilityLabel="Favorite"
          >
            <AppIcon
              icon={FavouriteIcon}
              size={20}
              color={isFavorited ? "#EF4444" : "#FFFFFF"}
              strokeWidth={2.2}
            />
          </PressableScale>
        </Animated.View>
      )}

      {/* Floating Frosted Bottom Bar */}
      {showBars && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.bottomBarWrapper,
            { bottom: Math.max(insets.bottom + 8, 20) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.bottomPill}>
            <PressableScale
              haptic
              scaleTo={0.92}
              style={styles.bottomActionButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <AppIcon
                icon={Share01Icon}
                size={19}
                color="#FFFFFF"
                strokeWidth={2}
              />
              <Text style={styles.bottomActionText}>Share</Text>
            </PressableScale>

            <PressableScale
              haptic
              scaleTo={0.92}
              style={styles.bottomActionButton}
              onPress={() => setInfoSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Details"
            >
              <AppIcon
                icon={InformationCircleIcon}
                size={19}
                color="#FFFFFF"
                strokeWidth={2}
              />
              <Text style={styles.bottomActionText}>Info</Text>
            </PressableScale>

            <PressableScale
              haptic
              scaleTo={0.92}
              style={styles.bottomActionButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete"
            >
              <AppIcon
                icon={Delete02Icon}
                size={19}
                color={Palette.destructive}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.bottomActionText,
                  { color: Palette.destructive },
                ]}
              >
                Delete
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      )}

      {/* Info Sheet */}
      <InfoSheet
        item={currentItem}
        visible={infoSheetVisible}
        onClose={() => setInfoSheetVisible(false)}
      />

      {/* Delete Confirmation Popup */}
      <ConfirmPopup
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Delete Item?"
        subtitle="This media file will be permanently removed from your device storage."
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={executeDelete}
      />
    </View>
  );
}

/**
 * VideoSlide
 * Renders static poster frame with Play button overlay.
 * Only mounts ActiveVideoPlayer when explicitly tapped by user.
 * Automatically halts playback when user swipes to a different slide.
 * ZERO native video player overhead while swiping or viewing!
 */
function VideoSlide({
  item,
  isActive,
}: {
  item: MediaItem;
  isActive: boolean;
}) {
  const [userRequestedPlay, setUserRequestedPlay] = useState(false);

  // Active player mounts only when the slide is active AND playback was requested
  const isPlaying = isActive && userRequestedPlay;

  if (isPlaying) {
    return <ActiveVideoPlayer uri={item.uri} />;
  }

  return (
    <PressableScale
      haptic
      scaleTo={0.98}
      style={styles.videoPosterContainer}
      onPress={() => setUserRequestedPlay(true)}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.fullImage}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
      />
      <View style={styles.playButtonOverlay}>
        <View style={styles.playButtonCircle}>
          <AppIcon
            icon={PlayIcon}
            size={28}
            color="#FFFFFF"
            strokeWidth={2.4}
          />
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * ActiveVideoPlayer
 * Isolated component that mounts useVideoPlayer ONLY when playback is requested.
 */
function ActiveVideoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        nativeControls
        style={styles.videoPlayer}
        contentFit="contain"
        surfaceType="surfaceView"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  sliderContainer: {
    flex: 1,
    overflow: "visible",
  },
  slideSlot: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoPosterContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 50,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(23, 23, 26, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonFavorited: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  headerTitleColumn: {
    alignItems: "center",
    backgroundColor: "rgba(23, 23, 26, 0.72)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  headerDateText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 1,
  },
  bottomBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  bottomPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(23, 23, 26, 0.88)",
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: 9,
    minWidth: 260,
    gap: Spacing.xl,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomActionButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  bottomActionText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
});

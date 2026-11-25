import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  FlatList,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
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
import { useFavoritesStore } from "../features/media/favoritesStore";
import { mediaService } from "../features/media/mediaService";
import { useMediaStore } from "../features/media/store";
import { MediaItem, SourceKey } from "../features/media/types";
import { useVideoThumbnail } from "../features/media/videoThumbnailService";
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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const {
    source = "camera",
    assetId,
    initialIndex: initialIndexParam,
  } = useLocalSearchParams<{
    source: SourceKey;
    assetId?: string;
    initialIndex?: string;
  }>();

  const isFavoritesSource = source === "favorites";
  const collection = useMediaStore((state) => state.getCollection(source));
  const removeItems = useMediaStore((state) => state.removeItems);
  const loadNextPage = useMediaStore((state) => state.loadNextPage);
  const loadInitial = useMediaStore((state) => state.loadInitial);

  const favoritesMap = useFavoritesStore((state) => state.favoritesMap);
  const hydrateFavorites = useFavoritesStore((state) => state.hydrate);
  const toggleFavoriteItem = useFavoritesStore((state) => state.toggleFavorite);
  const pruneFavorites = useFavoritesStore((state) => state.pruneDeleted);

  useEffect(() => {
    hydrateFavorites();
  }, [hydrateFavorites]);

  // If source hasn't been loaded yet, trigger loadInitial
  useEffect(() => {
    if (
      !isFavoritesSource &&
      collection.items.length === 0 &&
      collection.status !== "loading"
    ) {
      loadInitial(source, source === "camera");
    }
  }, [
    isFavoritesSource,
    collection.items.length,
    collection.status,
    loadInitial,
    source,
  ]);

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const sourceItems = useMemo(() => {
    if (isFavoritesSource) {
      return Object.values(favoritesMap).sort(
        (a, b) => b.creationTime - a.creationTime,
      );
    }
    return collection.items;
  }, [isFavoritesSource, favoritesMap, collection.items]);

  const items = useMemo(() => {
    return sourceItems.filter((i) => !deletedIds.has(i.id));
  }, [sourceItems, deletedIds]);

  // Determine starting index accurately from query params or assetId search
  const computedInitialIndex = useMemo(() => {
    if (initialIndexParam !== undefined) {
      const parsed = parseInt(initialIndexParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < sourceItems.length) {
        return parsed;
      }
    }
    if (assetId && sourceItems.length > 0) {
      const idx = sourceItems.findIndex((i) => i.id === assetId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [initialIndexParam, assetId, sourceItems]);

  const [currentIndex, setCurrentIndex] = useState(computedInitialIndex);
  const [showBars, setShowBars] = useState(true);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<MediaItem>>(null);
  const initialScrollDone = useRef(false);

  // Ensure scroll is positioned at initial index once items are populated
  useEffect(() => {
    if (!initialScrollDone.current && items.length > 0) {
      initialScrollDone.current = true;
      if (computedInitialIndex > 0 && computedInitialIndex < items.length) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: computedInitialIndex,
            animated: false,
          });
        }, 10);
      }
    }
  }, [items.length, computedInitialIndex]);

  // FIX-2: Priority Hardware Back Button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (infoSheetVisible) {
          setInfoSheetVisible(false);
          return true;
        }
        if (deleteConfirmVisible) {
          setDeleteConfirmVisible(false);
          return true;
        }
        router.back();
        return true;
      },
    );
    return () => backHandler.remove();
  }, [infoSheetVisible, deleteConfirmVisible, router]);

  const currentItem = items[currentIndex];

  // Auto-fetch next page when nearing end of current loaded list (VIEW-7)
  useEffect(() => {
    if (
      !isFavoritesSource &&
      currentIndex >= items.length - 8 &&
      items.length > 0
    ) {
      loadNextPage(source);
    }
  }, [isFavoritesSource, currentIndex, items.length, loadNextPage, source]);

  const toggleBars = useCallback(() => {
    setShowBars((prev) => !prev);
  }, []);

  const dismissViewer = useCallback(() => {
    router.back();
  }, [router]);

  const toggleFavorite = useCallback(() => {
    if (!currentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    toggleFavoriteItem(currentItem);
  }, [currentItem, toggleFavoriteItem]);

  const isFavorited = currentItem
    ? Boolean(favoritesMap[currentItem.id])
    : false;
  const isVideoPlaying = Boolean(
    currentItem && playingVideoId === currentItem.id,
  );

  const handleShare = async () => {
    if (!currentItem) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Notice", "Sharing is not supported on this device");
        return;
      }
      await Sharing.shareAsync(currentItem.fileUri || currentItem.uri);
    } catch (err: any) {
      Alert.alert("Share Error", err?.message || "Could not share item");
    }
  };

  const executeDelete = async () => {
    if (!currentItem || isDeleting) return;
    setIsDeleting(true);
    try {
      const deleted = await mediaService.deleteAssets([currentItem.id]);
      setDeleteConfirmVisible(false);
      if (!deleted) {
        return; // User cancelled Android OS delete confirmation dialog
      }

      removeItems([currentItem.id]);
      pruneFavorites([currentItem.id]);
      setIsZoomed(false);
      setPlayingVideoId(null);

      const nextItems = items.filter((i) => i.id !== currentItem.id);
      if (nextItems.length === 0) {
        router.back();
      } else {
        setDeletedIds((prev) => new Set([...prev, currentItem.id]));
        const nextIdx = Math.min(currentIndex, nextItems.length - 1);
        setCurrentIndex(nextIdx);
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({
            index: nextIdx,
            animated: false,
          });
        });
      }
    } catch {
      Alert.alert("Error", "Couldn't delete item. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!currentItem) return;
    // Android 11+ already presents its own native Scoped Storage confirmation dialog
    if (
      Platform.OS === "android" &&
      Number(Platform.Version) >= 30 &&
      !mediaService.isDemoMode
    ) {
      executeDelete();
      return;
    }
    setDeleteConfirmVisible(true);
  };

  const handleMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIdx = Math.round(offsetX / SCREEN_WIDTH);
      if (newIdx >= 0 && newIdx < items.length && newIdx !== currentIndex) {
        setCurrentIndex(newIdx);
        setIsZoomed(false);
        setPlayingVideoId(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [SCREEN_WIDTH, items.length, currentIndex],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [SCREEN_WIDTH],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const isActive = index === currentIndex;

      if (item.mediaType === "video") {
        return (
          <VideoSlide
            item={item}
            isPlaying={isActive && playingVideoId === item.id}
            onPlay={() => setPlayingVideoId(item.id)}
            screenWidth={SCREEN_WIDTH}
            screenHeight={SCREEN_HEIGHT}
          />
        );
      }

      return (
        <PhotoSlide
          item={item}
          isActive={isActive}
          screenWidth={SCREEN_WIDTH}
          screenHeight={SCREEN_HEIGHT}
          onToggleBars={toggleBars}
          onZoomChange={setIsZoomed}
          onDismiss={dismissViewer}
        />
      );
    },
    [
      currentIndex,
      playingVideoId,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      toggleBars,
      dismissViewer,
    ],
  );

  if (items.length === 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Native Horizontal Pager (FIX-3: FlatList with pagingEnabled) */}
      <FlatList
        ref={flatListRef}
        data={items}
        extraData={currentIndex}
        horizontal
        pagingEnabled
        disableIntervalMomentum
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={
          computedInitialIndex > 0 && computedInitialIndex < items.length
            ? computedInitialIndex
            : undefined
        }
        getItemLayout={getItemLayout}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews={false}
        scrollEnabled={!isZoomed}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onEndReached={() => {
          if (!isFavoritesSource && currentIndex >= items.length - 8) {
            loadNextPage(source);
          }
        }}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 30);
        }}
      />

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

      {/* Floating Frosted Bottom Bar (hidden during active video playback so it never blocks native scrubber) */}
      {showBars && !isVideoPlaying && (
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
 * PhotoSlide (FIX-3, FIX-4)
 * Features:
 * - Instant cached thumbnail via placeholder (FIX-4)
 * - Worklet-driven pinch-to-zoom (1x-5x) and double-tap zoom (1x <-> 2.5x)
 * - Vertical swipe-down to dismiss at 1x
 * - Soft-boundary pan clamping when zoomed
 * - Resets zoom automatically when leaving screen
 */
const PhotoSlide = memo(function PhotoSlide({
  item,
  isActive,
  screenWidth,
  screenHeight,
  onToggleBars,
  onZoomChange,
  onDismiss,
}: {
  item: MediaItem;
  isActive: boolean;
  screenWidth: number;
  screenHeight: number;
  onToggleBars: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  // Reset zoom whenever slide leaves active position
  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
      dismissY.value = 0;
    }
  }, [
    isActive,
    scale,
    savedScale,
    translateX,
    translateY,
    savedX,
    savedY,
    dismissY,
  ]);

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(isActive)
        .onEnd(() => {
          "worklet";
          runOnJS(onToggleBars)();
        }),
    [isActive, onToggleBars],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .enabled(isActive)
        .onEnd((e) => {
          "worklet";
          if (scale.value > 1.05) {
            scale.value = withTiming(1);
            savedScale.value = 1;
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedX.value = 0;
            savedY.value = 0;
            runOnJS(onZoomChange)(false);
          } else {
            const targetScale = 2.5;
            const maxDragX = ((targetScale - 1) * screenWidth) / 2;
            const maxDragY = ((targetScale - 1) * screenHeight) / 2;
            const offsetX = (screenWidth / 2 - e.x) * (targetScale - 1);
            const offsetY = (screenHeight / 2 - e.y) * (targetScale - 1);
            const clampedX = Math.max(-maxDragX, Math.min(maxDragX, offsetX));
            const clampedY = Math.max(-maxDragY, Math.min(maxDragY, offsetY));

            scale.value = withTiming(targetScale);
            savedScale.value = targetScale;
            translateX.value = withTiming(clampedX);
            translateY.value = withTiming(clampedY);
            savedX.value = clampedX;
            savedY.value = clampedY;
            runOnJS(onZoomChange)(true);
          }
        }),
    [
      isActive,
      onZoomChange,
      screenWidth,
      screenHeight,
      scale,
      savedScale,
      translateX,
      translateY,
      savedX,
      savedY,
    ],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(isActive)
        .onUpdate((e) => {
          "worklet";
          const nextScale = Math.max(
            1,
            Math.min(savedScale.value * e.scale, 5),
          );
          const maxDragX = ((nextScale - 1) * screenWidth) / 2;
          const maxDragY = ((nextScale - 1) * screenHeight) / 2;
          const scaleDelta =
            savedScale.value > 0 ? nextScale / savedScale.value : 1;
          const focalShiftX = (screenWidth / 2 - e.focalX) * (scaleDelta - 1);
          const focalShiftY = (screenHeight / 2 - e.focalY) * (scaleDelta - 1);

          scale.value = nextScale;
          translateX.value = Math.max(
            -maxDragX,
            Math.min(maxDragX, savedX.value + focalShiftX),
          );
          translateY.value = Math.max(
            -maxDragY,
            Math.min(maxDragY, savedY.value + focalShiftY),
          );
          if (nextScale > 1.05) {
            runOnJS(onZoomChange)(true);
          }
        })
        .onEnd(() => {
          "worklet";
          savedScale.value = scale.value;
          savedX.value = translateX.value;
          savedY.value = translateY.value;
          if (scale.value < 1.05) {
            scale.value = withTiming(1);
            savedScale.value = 1;
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedX.value = 0;
            savedY.value = 0;
            runOnJS(onZoomChange)(false);
          }
        }),
    [
      isActive,
      onZoomChange,
      screenWidth,
      screenHeight,
      savedScale,
      scale,
      translateX,
      translateY,
      savedX,
      savedY,
    ],
  );

  // Pan within zoomed image - manually activates ONLY when zoomed (> 1.02) so 1x horizontal swipe stays instant
  const zoomPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isActive)
        .manualActivation(true)
        .onTouchesMove((e, state) => {
          "worklet";
          if (scale.value > 1.02 && e.numberOfTouches === 1) {
            state.activate();
          } else {
            state.fail();
          }
        })
        .onUpdate((e) => {
          "worklet";
          const maxDragX = ((scale.value - 1) * screenWidth) / 2;
          const maxDragY = ((scale.value - 1) * screenHeight) / 2;
          translateX.value = Math.max(
            -maxDragX,
            Math.min(maxDragX, savedX.value + e.translationX),
          );
          translateY.value = Math.max(
            -maxDragY,
            Math.min(maxDragY, savedY.value + e.translationY),
          );
        })
        .onEnd(() => {
          "worklet";
          savedX.value = translateX.value;
          savedY.value = translateY.value;
        }),
    [
      isActive,
      scale,
      screenWidth,
      screenHeight,
      translateX,
      translateY,
      savedX,
      savedY,
    ],
  );

  // Vertical swipe-down to dismiss at 1x zoom - fails fast on horizontal swipes so pager never locks
  const dismissPan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isActive)
        .manualActivation(true)
        .onTouchesDown((e, state) => {
          "worklet";
          if (
            scale.value > 1.02 ||
            e.numberOfTouches !== 1 ||
            e.changedTouches.length === 0
          ) {
            state.fail();
            return;
          }
          touchStartX.value = e.changedTouches[0].x;
          touchStartY.value = e.changedTouches[0].y;
        })
        .onTouchesMove((e, state) => {
          "worklet";
          if (
            scale.value > 1.02 ||
            e.numberOfTouches !== 1 ||
            e.allTouches.length === 0
          ) {
            state.fail();
            return;
          }
          const dx = e.allTouches[0].x - touchStartX.value;
          const dy = e.allTouches[0].y - touchStartY.value;
          if (Math.abs(dx) > 16 || dy < -12) {
            state.fail();
          } else if (dy > 20 && dy > Math.abs(dx) * 1.5) {
            state.activate();
          }
        })
        .onUpdate((e) => {
          "worklet";
          dismissY.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          "worklet";
          if (e.translationY > 110 || e.velocityY > 650) {
            runOnJS(onDismiss)();
          } else {
            dismissY.value = withSpring(0, { damping: 24, stiffness: 280 });
          }
        }),
    [isActive, scale, dismissY, touchStartX, touchStartY, onDismiss],
  );

  const tapGestures = useMemo(
    () => Gesture.Exclusive(doubleTap, singleTap),
    [doubleTap, singleTap],
  );

  const composedGestures = useMemo(() => {
    return Gesture.Simultaneous(tapGestures, pinch, zoomPan, dismissPan);
  }, [tapGestures, pinch, zoomPan, dismissPan]);

  const animatedStyle = useAnimatedStyle(() => {
    const dismissScale = 1 - Math.min(dismissY.value / 1400, 0.14);
    const dismissOpacity = 1 - Math.min(dismissY.value / 500, 0.45);
    return {
      opacity: dismissOpacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + dismissY.value },
        { scale: scale.value * dismissScale },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGestures}>
      <Animated.View
        style={[
          styles.slideContainer,
          { width: screenWidth, height: screenHeight },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: item.uri }}
          style={{ width: screenWidth, height: screenHeight }}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          recyclingKey={item.id}
          transition={0}
        />
      </Animated.View>
    </GestureDetector>
  );
});

/**
 * VideoSlide (FIX-5)
 * - Only mounts VideoPlayer when explicitly requested
 * - Automatically halts playback and resets userRequestedPlay on swipe-away
 * - Shows helpful error state if video fails to play
 */
function VideoSlide({
  item,
  isPlaying,
  onPlay,
  screenWidth,
  screenHeight,
}: {
  item: MediaItem;
  isPlaying: boolean;
  onPlay: () => void;
  screenWidth: number;
  screenHeight: number;
}) {
  const [hasError, setHasError] = useState(false);
  const posterUri = useVideoThumbnail(item.id, item.uri, true, 384);

  if (isPlaying && !hasError) {
    return (
      <ActiveVideoPlayer
        uri={item.uri}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <PressableScale
      haptic
      scaleTo={0.98}
      style={[
        styles.videoPosterContainer,
        { width: screenWidth, height: screenHeight },
      ]}
      onPress={() => {
        setHasError(false);
        onPlay();
      }}
    >
      {posterUri ? (
        <Image
          source={{ uri: posterUri, width: 384, height: 384 }}
          style={{ width: screenWidth, height: screenHeight }}
          contentFit="contain"
          cachePolicy="memory"
          priority="low"
          recyclingKey={item.id}
          transition={0}
        />
      ) : null}
      <View style={styles.playButtonOverlay}>
        <View style={styles.playButtonCircle}>
          <AppIcon
            icon={PlayIcon}
            size={28}
            color="#FFFFFF"
            strokeWidth={2.4}
          />
        </View>
        {hasError && (
          <Text style={styles.videoErrorText}>{"Can't play this video"}</Text>
        )}
      </View>
    </PressableScale>
  );
}

/**
 * ActiveVideoPlayer (FIX-5)
 * Isolated component mounting useVideoPlayer strictly during active playback.
 */
function ActiveVideoPlayer({
  uri,
  screenWidth,
  screenHeight,
  onError,
}: {
  uri: string;
  screenWidth: number;
  screenHeight: number;
  onError: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error" || error) {
        onError();
      }
    });
    return () => {
      sub.remove();
    };
  }, [player, onError]);

  return (
    <View
      style={[
        styles.videoContainer,
        { width: screenWidth, height: screenHeight },
      ]}
    >
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
  slideContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.black,
  },
  videoContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.black,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoPosterContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.black,
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
  videoErrorText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginTop: 12,
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

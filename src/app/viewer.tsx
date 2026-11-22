import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { useMediaStore } from '../features/media/store';
import { mediaService } from '../features/media/mediaService';
import { MediaItem, SourceKey } from '../features/media/types';
import { InfoSheet } from '../components/InfoSheet';
import { ConfirmPopup } from '../components/ui/popup';
import { PressableScale } from '../components/ui/pressable-scale';
import {
  AppIcon,
  ArrowLeft02Icon,
  Delete02Icon,
  InformationCircleIcon,
  PlayIcon,
  Share01Icon,
} from '../components/ui/Icon';
import { Fonts, Palette, Radius, Spacing } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FullscreenViewer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source = 'camera', assetId } = useLocalSearchParams<{
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

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = collection.items.findIndex((i) => i.id === assetId);
    return idx >= 0 ? idx : 0;
  });

  const [showBars, setShowBars] = useState(true);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const currentItem = items[currentIndex];

  // Near the end of loaded items, trigger next page (VIEW-7)
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (typeof idx === 'number') {
        setCurrentIndex(idx);
        if (idx >= items.length - 10) {
          loadNextPage(source);
        }
      }
    }
  }, [items.length, loadNextPage, source]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  const toggleBars = useCallback(() => {
    setShowBars((prev) => !prev);
  }, []);

  const handleShare = async () => {
    if (!currentItem) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Notice', 'Sharing is not supported on this device');
        return;
      }
      await Sharing.shareAsync(currentItem.uri);
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || 'Could not share item');
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
      }
    } catch {
      Alert.alert('Error', "Couldn't delete item. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTitle = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Paging FlatList (VIEW-1, VIEW-2) */}
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={!isZoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        renderItem={({ item, index }) => (
          <ViewerPage
            item={item}
            isActive={index === currentIndex}
            onToggleBars={toggleBars}
            onClose={() => router.back()}
            onZoomChange={setIsZoomed}
          />
        )}
      />

      {/* Floating Top Bar (VIEW-5) */}
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
            <AppIcon icon={ArrowLeft02Icon} size={20} color="#FFFFFF" strokeWidth={2.2} />
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
            style={styles.circleButton}
            onPress={() => setInfoSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Information"
          >
            <AppIcon icon={InformationCircleIcon} size={20} color="#FFFFFF" strokeWidth={2.2} />
          </PressableScale>
        </Animated.View>
      )}

      {/* Floating Frosted Bottom Bar (VIEW-5) */}
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
              <AppIcon icon={Share01Icon} size={19} color="#FFFFFF" strokeWidth={2} />
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
              <AppIcon icon={InformationCircleIcon} size={19} color="#FFFFFF" strokeWidth={2} />
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
              <AppIcon icon={Delete02Icon} size={19} color={Palette.destructive} strokeWidth={2} />
              <Text style={[styles.bottomActionText, { color: Palette.destructive }]}>
                Delete
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      )}

      {/* Info Sheet (VIEW-9) */}
      {currentItem && (
        <InfoSheet
          item={currentItem}
          visible={infoSheetVisible}
          onClose={() => setInfoSheetVisible(false)}
        />
      )}

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

interface ViewerPageProps {
  item: MediaItem;
  isActive: boolean;
  onToggleBars: () => void;
  onClose: () => void;
  onZoomChange: (zoomed: boolean) => void;
}

function ViewerPage({
  item,
  isActive,
  onToggleBars,
  onClose,
  onZoomChange,
}: ViewerPageProps) {
  if (item.mediaType === 'video') {
    return (
      <VideoViewerPage
        item={item}
        isActive={isActive}
        onToggleBars={onToggleBars}
      />
    );
  }

  return (
    <PhotoViewerPage
      item={item}
      onToggleBars={onToggleBars}
      onClose={onClose}
      onZoomChange={onZoomChange}
    />
  );
}

/**
 * PhotoViewerPage
 * Clean horizontal paging support:
 * - When not zoomed (1x), horizontal gestures pass freely to FlatList for swiping between photos.
 * - Swipe down vertically dismisses viewer.
 * - Double-tap toggles 1x <-> 2.5x.
 * - Pinch-to-zoom up to 5x.
 * - 2D pan enabled only when zoomed.
 */
function PhotoViewerPage({
  item,
  onToggleBars,
  onClose,
  onZoomChange,
}: {
  item: MediaItem;
  onToggleBars: () => void;
  onClose: () => void;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isZoomedInternal, setIsZoomedInternal] = useState(false);

  const updateZoomState = useCallback(
    (zoomed: boolean) => {
      setIsZoomedInternal(zoomed);
      onZoomChange(zoomed);
    },
    [onZoomChange]
  );

  // Single Tap: Toggle HUD bars (VIEW-4)
  const singleTap = Gesture.Tap().onEnd(() => {
    runOnJS(onToggleBars)();
  });

  // Double Tap: Toggle zoom (1x <-> 2.5x)
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(updateZoomState)(true);
      }
    });

  // Pinch Gesture: 1x to 5x zoom
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      runOnJS(updateZoomState)(scale.value > 1.05);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      }
    });

  // 1. Swipe down dismiss (ONLY active when NOT zoomed, and FAILS on horizontal drag)
  const swipeDownDismiss = Gesture.Pan()
    .enabled(!isZoomedInternal)
    .activeOffsetY([18, 18])
    .failOffsetX([-18, 18]) // Crucial: fails immediately on horizontal drag so FlatList can swipe left/right!
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0);
      }
    });

  // 2. Pan when zoomed (ONLY active when zoomed in)
  const zoomPan = Gesture.Pan()
    .enabled(isZoomedInternal)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    Gesture.Simultaneous(pinch, zoomPan, swipeDownDismiss)
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.page}>
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
          <Image
            source={{ uri: item.uri }}
            style={styles.fullImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * VideoViewerPage (VIEW-6)
 * Single active video player with native controls,
 * and poster frame with centered play button before starting.
 */
function VideoViewerPage({
  item,
  isActive,
  onToggleBars,
}: {
  item: MediaItem;
  isActive: boolean;
  onToggleBars: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(item.uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!isActive) {
      player.pause();
    }
  }, [isActive, player]);

  const handleStartPlay = () => {
    setIsPlaying(true);
    player.play();
  };

  return (
    <View style={styles.page}>
      {isActive && isPlaying ? (
        <VideoView
          player={player}
          nativeControls
          style={styles.videoPlayer}
          contentFit="contain"
        />
      ) : (
        <PressableScale
          haptic
          scaleTo={0.98}
          style={styles.videoPosterContainer}
          onPress={handleStartPlay}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.fullImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />

          <View style={styles.playButtonOverlay}>
            <View style={styles.playButtonCircle}>
              <AppIcon icon={PlayIcon} size={28} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </View>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  flatList: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  videoPosterContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 50,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(23, 23, 26, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleColumn: {
    alignItems: 'center',
    backgroundColor: 'rgba(23, 23, 26, 0.72)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerDateText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 1,
  },
  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  bottomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(23, 23, 26, 0.88)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 9,
    minWidth: 260,
    gap: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  bottomActionText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});

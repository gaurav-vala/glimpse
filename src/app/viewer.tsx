import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
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
} from 'react-native-reanimated';

import { useMediaStore } from '../features/media/store';
import { mediaService } from '../features/media/mediaService';
import { MediaItem, SourceKey } from '../features/media/types';
import { InfoSheet } from '../components/InfoSheet';
import {
  AppIcon,
  ArrowLeft02Icon,
  Delete02Icon,
  InformationCircleIcon,
  PlayIcon,
  Share01Icon,
} from '../components/ui/Icon';
import { Fonts, Palette, Radius, Spacing } from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

    Alert.alert('Delete', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await mediaService.deleteAssets([currentItem.id]);
            removeItems([currentItem.id]);

            const nextItems = items.filter((i) => i.id !== currentItem.id);
            if (nextItems.length === 0) {
              router.back();
            } else {
              setDeletedIds((prev) => new Set([...prev, currentItem.id]));
              const nextIdx = Math.min(currentIndex, nextItems.length - 1);
              setCurrentIndex(nextIdx);
            }
          } catch {
            Alert.alert('Error', "Couldn't delete item. Try again.");
          }
        },
      },
    ]);
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

      {/* Top Floating Bar (VIEW-5) */}
      {showBars && (
        <Animated.View
          style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}
        >
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <AppIcon icon={ArrowLeft02Icon} size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleColumn}>
            <Text style={styles.headerDateText}>
              {formatDateTitle(currentItem?.creationTime)}
            </Text>
            <Text style={styles.headerSubtitleText}>
              {currentIndex + 1} of {items.length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => setInfoSheetVisible(true)}
            activeOpacity={0.7}
          >
            <AppIcon icon={InformationCircleIcon} size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom Floating Bar (VIEW-5) */}
      {showBars && (
        <Animated.View
          style={[
            styles.bottomBarWrapper,
            { bottom: Math.max(insets.bottom + 8, 20) },
          ]}
        >
          <View style={styles.bottomPill}>
            <TouchableOpacity
              style={styles.bottomActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <AppIcon icon={Share01Icon} size={20} color="#FFFFFF" />
              <Text style={styles.bottomActionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomActionButton}
              onPress={() => setInfoSheetVisible(true)}
              activeOpacity={0.7}
            >
              <AppIcon icon={InformationCircleIcon} size={20} color="#FFFFFF" />
              <Text style={styles.bottomActionText}>Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomActionButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <AppIcon icon={Delete02Icon} size={20} color={Palette.destructive} />
              <Text style={[styles.bottomActionText, { color: Palette.destructive }]}>
                Delete
              </Text>
            </TouchableOpacity>
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
 * Reanimated 4 Worklet-based gestures for pinch-to-zoom (1x-5x),
 * double-tap toggle, pan when zoomed, and swipe down to close (VIEW-3, VIEW-10).
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

  const updateZoomState = useCallback(
    (zoomed: boolean) => {
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

  // Pan Gesture: Pan while zoomed, or swipe down to close when scale == 1
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else if (e.translationY > 0) {
        // Swipe down feedback
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.05) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        if (e.translationY > 120) {
          // Close viewer (VIEW-10)
          runOnJS(onClose)();
        } else {
          translateY.value = withTiming(0);
        }
      }
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    Gesture.Simultaneous(pinch, pan)
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

  // Initialize player only if active and user started playing
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
        <TouchableOpacity
          style={styles.videoPosterContainer}
          onPress={handleStartPlay}
          activeOpacity={0.9}
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
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoPosterContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
    borderRadius: Radius.round,
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(10, 10, 12, 0.82)',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleColumn: {
    alignItems: 'center',
  },
  headerDateText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  headerSubtitleText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20, 20, 24, 0.88)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
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
  },
  bottomActionText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#FFFFFF',
  },
});

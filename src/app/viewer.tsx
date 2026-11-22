import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
  FavouriteIcon,
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

  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [showBars, setShowBars] = useState(true);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentItem = items[currentIndex];
  const prevItem = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;

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

  // Reanimated Horizontal Carousel & Dismiss Shared Values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Zoom shared values for current image
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
  }, [scale, savedScale, zoomTranslateX, zoomTranslateY, savedZoomX, savedZoomY]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetZoom();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, items.length, resetZoom]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetZoom();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [currentIndex, resetZoom]);

  // Gestures

  // 1. Single Tap: Toggle HUD
  const singleTap = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(toggleBars)();
  });

  // 2. Double Tap: Zoom 1x <-> 2.5x
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
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
      'worklet';
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      if (scale.value > 1.05 && !isZoomed) {
        runOnJS(setIsZoomed)(true);
      }
    })
    .onEnd(() => {
      'worklet';
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

  // 4. Unified Pan Gesture: handles horizontal swipe, vertical dismiss, and zoom panning
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (scale.value > 1.05) {
        // Zoomed in: pan inside zoomed photo
        zoomTranslateX.value = savedZoomX.value + e.translationX;
        zoomTranslateY.value = savedZoomY.value + e.translationY;
      } else if (Math.abs(e.translationY) > Math.abs(e.translationX) && e.translationY > 0) {
        // Dragging downwards: swipe down dismiss
        translateY.value = e.translationY;
      } else {
        // Dragging horizontally: swipe between images
        if (currentIndex === 0 && e.translationX > 0) {
          translateX.value = e.translationX * 0.25; // Edge resistance
        } else if (currentIndex === items.length - 1 && e.translationX < 0) {
          translateX.value = e.translationX * 0.25; // Edge resistance
        } else {
          translateX.value = e.translationX;
        }
      }
    })
    .onEnd((e) => {
      'worklet';
      if (scale.value > 1.05) {
        savedZoomX.value = zoomTranslateX.value;
        savedZoomY.value = zoomTranslateY.value;
      } else if (translateY.value > 120 || e.velocityY > 600) {
        runOnJS(router.back)();
      } else if (translateY.value > 0) {
        translateY.value = withTiming(0);
      } else {
        const swipeDistanceThreshold = SCREEN_WIDTH * 0.18;
        const swipeVelocityThreshold = 350;

        if (
          (e.translationX < -swipeDistanceThreshold || e.velocityX < -swipeVelocityThreshold) &&
          currentIndex < items.length - 1
        ) {
          // Slide to next image
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180 }, (finished) => {
            if (finished) {
              runOnJS(goToNext)();
              translateX.value = 0;
            }
          });
        } else if (
          (e.translationX > swipeDistanceThreshold || e.velocityX > swipeVelocityThreshold) &&
          currentIndex > 0
        ) {
          // Slide to previous image
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 180 }, (finished) => {
            if (finished) {
              runOnJS(goToPrev)();
              translateX.value = 0;
            }
          });
        } else {
          // Snap back to center
          translateX.value = withSpring(0, { damping: 25, stiffness: 320 });
        }
      }
    });

  const composedGestures = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    pinch,
    panGesture
  );

  const animatedSliderStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
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
      {/* Interactive Swipeable Carousel */}
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.sliderContainer, animatedSliderStyle]}>
          {/* Previous Image (offset left) */}
          {prevItem && (
            <View style={[styles.slideSlot, { transform: [{ translateX: -SCREEN_WIDTH }] }]}>
              {prevItem.mediaType === 'video' ? (
                <VideoSlide item={prevItem} isActive={false} />
              ) : (
                <Image
                  source={{ uri: prevItem.uri }}
                  style={styles.fullImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          )}

          {/* Current Active Image (centered) */}
          <Animated.View style={[styles.slideSlot, currentImageAnimatedStyle]}>
            {currentItem.mediaType === 'video' ? (
              <VideoSlide item={currentItem} isActive={true} />
            ) : (
              <Image
                source={{ uri: currentItem.uri }}
                style={styles.fullImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={150}
              />
            )}
          </Animated.View>

          {/* Next Image (offset right) */}
          {nextItem && (
            <View style={[styles.slideSlot, { transform: [{ translateX: SCREEN_WIDTH }] }]}>
              {nextItem.mediaType === 'video' ? (
                <VideoSlide item={nextItem} isActive={false} />
              ) : (
                <Image
                  source={{ uri: nextItem.uri }}
                  style={styles.fullImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          )}
        </Animated.View>
      </GestureDetector>

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
            style={[styles.circleButton, isFavorited && styles.circleButtonFavorited]}
            onPress={toggleFavorite}
            accessibilityRole="button"
            accessibilityLabel="Favorite"
          >
            <AppIcon
              icon={FavouriteIcon}
              size={20}
              color={isFavorited ? '#EF4444' : '#FFFFFF'}
              strokeWidth={2.2}
            />
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

function VideoSlide({ item, isActive }: { item: MediaItem; isActive: boolean }) {
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

  if (isActive && isPlaying) {
    return (
      <VideoView
        player={player}
        nativeControls
        style={styles.videoPlayer}
        contentFit="contain"
      />
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  sliderContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
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
  circleButtonFavorited: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
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

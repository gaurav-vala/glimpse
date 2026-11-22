import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { MediaGrid } from '../../components/MediaGrid';
import { AlbumsFeed } from '../../components/AlbumsFeed';
import { SelectionTopBar, SelectionBottomBar } from '../../components/SelectionBar';
import { useCollection } from '../../features/media/useCollection';
import { useSelectionStore } from '../../features/selection/store';
import { useMainTabStore } from '../../features/navigation/tabStore';
import { mediaService } from '../../features/media/mediaService';
import { MediaItem } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';
import { SparklesIcon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraTab() {
  const router = useRouter();

  // Scoped strictly to DCIM/Camera folder (user decision #1)
  const { collection, loadNextPage, refresh } = useCollection('camera', true);

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const activeTab = useMainTabStore((s) => s.activeTab);
  const setActiveTab = useMainTabStore((s) => s.setActiveTab);

  // Reanimated Horizontal Paging
  const translateX = useSharedValue(-activeTab * SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(-activeTab * SCREEN_WIDTH, {
      damping: 28,
      stiffness: 300,
      mass: 0.8,
    });
  }, [activeTab, translateX]);

  const switchTab = useCallback(
    (tabIndex: number) => {
      Haptics.selectionAsync().catch(() => {});
      setActiveTab(tabIndex);
    },
    [setActiveTab]
  );

  // Horizontal pan gesture with continuous finger tracking
  const mainPanGesture = Gesture.Pan()
    .enabled(!isSelectionMode)
    .activeOffsetX([-20, 20])
    .failOffsetY([-18, 18])
    .onUpdate((e) => {
      'worklet';
      const baseOffset = -activeTab * SCREEN_WIDTH;
      if (activeTab === 0 && e.translationX > 0) {
        translateX.value = baseOffset + e.translationX * 0.25; // Resistance at left edge
      } else if (activeTab === 1 && e.translationX < 0) {
        translateX.value = baseOffset + e.translationX * 0.25; // Resistance at right edge
      } else {
        translateX.value = baseOffset + e.translationX;
      }
    })
    .onEnd((e) => {
      'worklet';
      const threshold = SCREEN_WIDTH * 0.18;
      const velocityThreshold = 350;

      if (activeTab === 0 && (e.translationX < -threshold || e.velocityX < -velocityThreshold)) {
        // Dragged left from Camera -> Switch to Albums
        runOnJS(switchTab)(1);
      } else if (activeTab === 1 && (e.translationX > threshold || e.velocityX > velocityThreshold)) {
        // Dragged right from Albums -> Switch to Camera
        runOnJS(switchTab)(0);
      } else {
        // Snap back to current tab
        translateX.value = withSpring(-activeTab * SCREEN_WIDTH, {
          damping: 28,
          stiffness: 300,
        });
      }
    });

  const animatedPagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      router.push({
        pathname: '/viewer',
        params: { source: 'camera', assetId: item.id },
      });
    },
    [router]
  );

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    try {
      await mediaService.deleteAssets(ids);
      exitSelectionMode();
      refresh();
    } catch {
      Alert.alert('Error', "Couldn't delete. Try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Selection Top Bar */}
      {isSelectionMode && (
        <SelectionTopBar
          selectedCount={selectedIds.size}
          onClose={exitSelectionMode}
        />
      )}

      {/* Interactive Horizontal Sliding Pager */}
      <GestureDetector gesture={mainPanGesture}>
        <Animated.View style={[styles.pagerRow, animatedPagerStyle]}>
          {/* Page 0: Camera Feed */}
          <View style={styles.page}>
            {!isSelectionMode && (
              <View style={styles.header}>
                <Text style={styles.title}>Camera</Text>
                {mediaService.isDemoMode && (
                  <Button
                    label="Add Photo"
                    icon={SparklesIcon}
                    size="sm"
                    shape="pill"
                    variant="frosted"
                    onPress={() => {
                      mediaService.simulateAddPhoto();
                      refresh();
                    }}
                  />
                )}
              </View>
            )}

            <MediaGrid
              items={collection.items}
              status={collection.status}
              hasNextPage={collection.hasNextPage}
              onLoadNextPage={loadNextPage}
              onRefresh={refresh}
              onItemPress={handleItemPress}
            />
          </View>

          {/* Page 1: Albums Feed */}
          <View style={styles.page}>
            <AlbumsFeed />
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Selection Bottom Floating Pill */}
      {isSelectionMode && (
        <SelectionBottomBar
          selectedCount={selectedIds.size}
          onDelete={handleDeleteSelected}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  pagerRow: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: DarkTheme.colors.text,
    letterSpacing: -0.6,
  },
});

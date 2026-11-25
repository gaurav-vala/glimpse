import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
import { useFavoritesStore } from '../../features/media/favoritesStore';
import { useMediaStore } from '../../features/media/store';
import { useSelectionStore } from '../../features/selection/store';
import { useMainTabStore } from '../../features/navigation/tabStore';
import { mediaService } from '../../features/media/mediaService';
import { MediaItem } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';
import { SparklesIcon, Download01Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/button';
import { useUpdateStore } from '../../features/updates/useUpdateStore';

export default function CameraTab() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Scoped strictly to DCIM/Camera folder (user decision #1)
  const { collection, loadNextPage, refresh } = useCollection('camera', true);
  const removeItems = useMediaStore((s) => s.removeItems);
  const pruneFavorites = useFavoritesStore((s) => s.pruneDeleted);

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeTab = useMainTabStore((s) => s.activeTab);
  const setActiveTab = useMainTabStore((s) => s.setActiveTab);
  const [albumsMounted, setAlbumsMounted] = useState(activeTab === 1);

  if (activeTab === 1 && !albumsMounted) {
    setAlbumsMounted(true);
  }

  const ensureAlbumsMounted = useCallback(() => {
    setAlbumsMounted(true);
  }, []);

  const hasUpdate = useUpdateStore((s) => s.hasUpdate);
  const openUpdateModal = useUpdateStore((s) => s.openModal);

  // Reanimated Horizontal Paging
  const translateX = useSharedValue(-activeTab * screenWidth);

  useEffect(() => {
    translateX.value = withSpring(-activeTab * screenWidth, {
      damping: 28,
      stiffness: 300,
      mass: 0.8,
    });
  }, [activeTab, screenWidth, translateX]);

  // Hardware Back exits selection mode or switches from Albums back to Camera
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSelectionMode) {
        exitSelectionMode();
        return true;
      }
      if (activeTab === 1) {
        setActiveTab(0);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isSelectionMode, exitSelectionMode, activeTab, setActiveTab]);

  const switchTab = useCallback(
    (tabIndex: number) => {
      Haptics.selectionAsync().catch(() => {});
      setActiveTab(tabIndex);
    },
    [setActiveTab]
  );

  // Horizontal pan gesture with continuous finger tracking
  const mainPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isSelectionMode)
        .activeOffsetX([-20, 20])
        .failOffsetY([-18, 18])
        .onStart(() => {
          'worklet';
          if (activeTab === 0) {
            runOnJS(ensureAlbumsMounted)();
          }
        })
        .onUpdate((e) => {
          'worklet';
          const baseOffset = -activeTab * screenWidth;
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
          const threshold = screenWidth * 0.18;
          const velocityThreshold = 350;

          if (activeTab === 0 && (e.translationX < -threshold || e.velocityX < -velocityThreshold)) {
            // Dragged left from Camera -> Switch to Albums
            runOnJS(switchTab)(1);
          } else if (activeTab === 1 && (e.translationX > threshold || e.velocityX > velocityThreshold)) {
            // Dragged right from Albums -> Switch to Camera
            runOnJS(switchTab)(0);
          } else {
            // Snap back to current tab
            translateX.value = withSpring(-activeTab * screenWidth, {
              damping: 28,
              stiffness: 300,
            });
          }
        }),
    [isSelectionMode, activeTab, screenWidth, translateX, switchTab, ensureAlbumsMounted]
  );

  const animatedPagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleItemPress = useCallback(
    (item: MediaItem, index?: number) => {
      router.push({
        pathname: '/viewer',
        params: {
          source: 'camera',
          assetId: item.id,
          initialIndex: index !== undefined ? String(index) : undefined,
        },
      });
    },
    [router]
  );

  const allSelected =
    collection.items.length > 0 && selectedIds.size >= collection.items.length;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      exitSelectionMode();
    } else {
      selectAll(collection.items.map((i) => i.id));
    }
  }, [allSelected, collection.items, exitSelectionMode, selectAll]);

  const handleShareSelected = useCallback(async () => {
    if (selectedIds.size !== 1) return;
    const targetId = Array.from(selectedIds)[0];
    const targetItem = collection.items.find((i) => i.id === targetId);
    if (!targetItem) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Notice', 'Sharing is not supported on this device');
        return;
      }
      await Sharing.shareAsync(targetItem.fileUri || targetItem.uri);
    } catch (err: any) {
      Alert.alert('Share Error', err?.message || 'Could not share item');
    }
  }, [selectedIds, collection.items]);

  const handleDeleteSelected = async () => {
    if (isDeleting || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setIsDeleting(true);
    try {
      const deleted = await mediaService.deleteAssets(ids);
      if (!deleted) {
        return; // User cancelled Android OS delete confirmation
      }
      removeItems(ids);
      pruneFavorites(ids);
      exitSelectionMode();
      refresh();
    } catch {
      Alert.alert('Error', "Couldn't delete. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Selection Top Bar */}
      {isSelectionMode && (
        <SelectionTopBar
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={collection.items.length > 0 ? handleSelectAll : undefined}
          onClose={exitSelectionMode}
        />
      )}

      {/* Interactive Horizontal Sliding Pager */}
      <GestureDetector gesture={mainPanGesture}>
        <Animated.View
          style={[styles.pagerRow, { width: screenWidth * 2 }, animatedPagerStyle]}
        >
          {/* Page 0: Camera Feed */}
          <View style={[styles.page, { width: screenWidth }]}>
            {!isSelectionMode && (
              <View style={styles.header}>
                <Text style={styles.title}>Camera</Text>
                <View style={styles.headerRight}>
                  {hasUpdate && (
                    <Button
                      label="Update"
                      icon={Download01Icon}
                      size="sm"
                      shape="pill"
                      variant="primary"
                      onPress={openUpdateModal}
                    />
                  )}
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

          {/* Page 1: Albums Feed (mounted lazily on first drag or tab tap so cold start stays fast) */}
          <View style={[styles.page, { width: screenWidth }]}>
            {albumsMounted ? <AlbumsFeed /> : null}
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Selection Bottom Floating Pill */}
      {isSelectionMode && (
        <SelectionBottomBar
          selectedCount={selectedIds.size}
          onDelete={handleDeleteSelected}
          onShare={handleShareSelected}
          isDeleting={isDeleting}
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
  },
  page: {
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});

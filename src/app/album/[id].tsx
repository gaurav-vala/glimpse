import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { MediaGrid } from '../../components/MediaGrid';
import { SelectionTopBar, SelectionBottomBar } from '../../components/SelectionBar';
import { useCollection } from '../../features/media/useCollection';
import { useFavoritesStore } from '../../features/media/favoritesStore';
import { useMediaStore } from '../../features/media/store';
import { useSelectionStore } from '../../features/selection/store';
import { mediaService } from '../../features/media/mediaService';
import { MediaItem } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';
import { AppIcon, ArrowLeft02Icon } from '../../components/ui/Icon';
import { PressableScale } from '../../components/ui/pressable-scale';

export const FAVORITES_ALBUM_ID = '__favorites__';

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  const isFavoritesAlbum = id === FAVORITES_ALBUM_ID;
  const sourceKey = isFavoritesAlbum ? ('favorites' as const) : (`album:${id}` as const);
  const { collection, loadNextPage, refresh } = useCollection(
    isFavoritesAlbum ? 'camera' : sourceKey,
    isFavoritesAlbum
  );
  const removeItems = useMediaStore((s) => s.removeItems);
  const favoritesMap = useFavoritesStore((s) => s.favoritesMap);
  const pruneFavorites = useFavoritesStore((s) => s.pruneDeleted);

  const items = useMemo(() => {
    if (isFavoritesAlbum) {
      return Object.values(favoritesMap).sort((a, b) => b.creationTime - a.creationTime);
    }
    return collection.items;
  }, [isFavoritesAlbum, favoritesMap, collection.items]);

  const totalCount = isFavoritesAlbum ? items.length : collection.totalCount;

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);
  const [isDeleting, setIsDeleting] = useState(false);

  // Never leak album selection back to main tabs when leaving
  useEffect(() => {
    return () => {
      exitSelectionMode();
    };
  }, [exitSelectionMode]);

  // Hardware Back exits selection mode before leaving the album
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSelectionMode) {
        exitSelectionMode();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isSelectionMode, exitSelectionMode]);

  const handleItemPress = useCallback(
    (item: MediaItem, index?: number) => {
      router.push({
        pathname: '/viewer',
        params: {
          source: sourceKey,
          assetId: item.id,
          initialIndex: index !== undefined ? String(index) : undefined,
        },
      });
    },
    [router, sourceKey]
  );

  const allSelected = items.length > 0 && selectedIds.size >= items.length;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      exitSelectionMode();
    } else {
      selectAll(items.map((i) => i.id));
    }
  }, [allSelected, items, exitSelectionMode, selectAll]);

  const handleShareSelected = useCallback(async () => {
    if (selectedIds.size !== 1) return;
    const targetId = Array.from(selectedIds)[0];
    const targetItem = items.find((i) => i.id === targetId);
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
  }, [selectedIds, items]);

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
      if (!isFavoritesAlbum) {
        refresh();
      }
    } catch {
      Alert.alert('Error', "Couldn't delete. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar / Header */}
      {isSelectionMode ? (
        <SelectionTopBar
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={items.length > 0 ? handleSelectAll : undefined}
          onClose={exitSelectionMode}
        />
      ) : (
        <View style={styles.header}>
          <PressableScale
            haptic
            scaleTo={0.9}
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon icon={ArrowLeft02Icon} size={22} color={DarkTheme.colors.text} />
          </PressableScale>

          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {isFavoritesAlbum ? 'Favorites' : title || 'Album'}
            </Text>
            <Text style={styles.subtitle}>{totalCount} items</Text>
          </View>
        </View>
      )}

      {/* Main Virtualized Grid */}
      <MediaGrid
        items={items}
        status={isFavoritesAlbum ? 'idle' : collection.status}
        hasNextPage={isFavoritesAlbum ? false : collection.hasNextPage}
        onLoadNextPage={isFavoritesAlbum ? () => {} : loadNextPage}
        onRefresh={isFavoritesAlbum ? () => {} : refresh}
        onItemPress={handleItemPress}
      />

      {/* Selection Bottom Action Bar */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: 999,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: DarkTheme.colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: DarkTheme.colors.textMuted,
    marginTop: 1,
  },
});

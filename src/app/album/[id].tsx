import React, { useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaGrid } from '../../components/MediaGrid';
import { SelectionTopBar, SelectionBottomBar } from '../../components/SelectionBar';
import { useCollection } from '../../features/media/useCollection';
import { useSelectionStore } from '../../features/selection/store';
import { mediaService } from '../../features/media/mediaService';
import { MediaItem } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';
import { AppIcon, ArrowLeft02Icon } from '../../components/ui/Icon';

export default function AlbumDetailScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  const sourceKey = `album:${id}` as const;
  const { collection, loadNextPage, refresh } = useCollection(sourceKey, false);

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      router.push({
        pathname: '/viewer',
        params: { source: sourceKey, assetId: item.id },
      });
    },
    [router, sourceKey]
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
      {/* Top Bar / Header */}
      {isSelectionMode ? (
        <SelectionTopBar
          selectedCount={selectedIds.size}
          onClose={exitSelectionMode}
        />
      ) : (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <AppIcon icon={ArrowLeft02Icon} size={22} color={DarkTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Album'}
            </Text>
            <Text style={styles.subtitle}>{collection.totalCount} items</Text>
          </View>
        </View>
      )}

      {/* Main Virtualized Grid */}
      <MediaGrid
        items={collection.items}
        status={collection.status}
        hasNextPage={collection.hasNextPage}
        onLoadNextPage={loadNextPage}
        onRefresh={refresh}
        onItemPress={handleItemPress}
      />

      {/* Selection Bottom Action Bar */}
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

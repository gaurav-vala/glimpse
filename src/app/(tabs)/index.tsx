import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MediaGrid } from '../../components/MediaGrid';
import { SelectionTopBar, SelectionBottomBar } from '../../components/SelectionBar';
import { useCollection } from '../../features/media/useCollection';
import { useSelectionStore } from '../../features/selection/store';
import { mediaService } from '../../features/media/mediaService';
import { MediaItem } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';
import { SparklesIcon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/button';

export default function CameraTab() {
  const router = useRouter();

  // Scoped strictly to DCIM/Camera folder (user decision #1)
  const { collection, loadNextPage, refresh } = useCollection('camera', true);

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const handleItemPress = useCallback(
    (item: MediaItem) => {
      // Open fullscreen viewer (params: source, assetId) (VIEW-1)
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
      {/* Top Header / Selection Bar (SEL-2) */}
      {isSelectionMode ? (
        <SelectionTopBar
          selectedCount={selectedIds.size}
          onClose={exitSelectionMode}
        />
      ) : (
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

      {/* Main Virtualized Media Grid */}
      <MediaGrid
        items={collection.items}
        status={collection.status}
        hasNextPage={collection.hasNextPage}
        onLoadNextPage={loadNextPage}
        onRefresh={refresh}
        onItemPress={handleItemPress}
      />

      {/* Selection Bottom Action Bar (SEL-4) */}
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
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  demoBadgeText: {
    fontFamily: Fonts.medium,
    color: '#93C5FD',
    fontSize: 12,
  },
});

import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MediaItem } from '../features/media/types';
import { MediaTile } from './MediaTile';
import { DateHeader, formatDateHeader } from './DateHeader';
import { AppIcon, Image01Icon } from './ui/Icon';
import { DarkTheme, Typography, Spacing } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const COLUMN_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - COLUMN_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type GridItem =
  | { type: 'header'; id: string; title: string }
  | { type: 'tile'; id: string; item: MediaItem };

interface MediaGridProps {
  items: MediaItem[];
  status: 'idle' | 'loading' | 'refreshing' | 'error';
  hasNextPage: boolean;
  onLoadNextPage: () => void;
  onRefresh: () => void;
  onItemPress: (item: MediaItem) => void;
}

export function MediaGrid({
  items,
  status,
  hasNextPage,
  onLoadNextPage,
  onRefresh,
  onItemPress,
}: MediaGridProps) {
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleItem = useSelectionStore((s) => s.toggleItem);
  const enterSelectionMode = useSelectionStore((s) => s.enterSelectionMode);

  // Group items by day for date headers (GRID-6)
  const gridData = useMemo<GridItem[]>(() => {
    const list: GridItem[] = [];
    let currentHeader = '';

    for (const item of items) {
      const headerTitle = formatDateHeader(item.creationTime);
      if (headerTitle !== currentHeader) {
        currentHeader = headerTitle;
        list.push({
          type: 'header',
          id: `header-${currentHeader}-${item.id}`,
          title: currentHeader,
        });
      }
      list.push({
        type: 'tile',
        id: item.id,
        item,
      });
    }

    return list;
  }, [items]);

  const handleTilePress = useCallback(
    (id: string) => {
      if (isSelectionMode) {
        toggleItem(id);
      } else {
        const found = items.find((i) => i.id === id);
        if (found) onItemPress(found);
      }
    },
    [isSelectionMode, toggleItem, items, onItemPress]
  );

  const handleTileLongPress = useCallback(
    (id: string) => {
      if (!isSelectionMode) {
        enterSelectionMode(id);
      } else {
        toggleItem(id);
      }
    },
    [isSelectionMode, enterSelectionMode, toggleItem]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.type === 'header') {
        return <DateHeader title={item.title} />;
      }

      const media = item.item;
      const isSelected = selectedIds.has(media.id);

      return (
        <View style={styles.tileWrapper}>
          <MediaTile
            id={media.id}
            uri={media.uri}
            mediaType={media.mediaType}
            duration={media.duration}
            tileSize={TILE_SIZE}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            onPress={handleTilePress}
            onLongPress={handleTileLongPress}
          />
        </View>
      );
    },
    [selectedIds, isSelectionMode, handleTilePress, handleTileLongPress]
  );

  const getItemType = useCallback((item: GridItem) => {
    return item.type;
  }, []);

  const keyExtractor = useCallback((item: GridItem) => item.id, []);

  // Empty library state (GRID-8)
  const ListEmptyComponent = useMemo(() => {
    if (status === 'loading') {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={DarkTheme.colors.accent} size="large" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <AppIcon icon={Image01Icon} size={48} color={DarkTheme.colors.textSecondary} />
        <Text style={styles.emptyTitle}>No photos or videos yet</Text>
        <Text style={styles.emptySubtitle}>Media taken with your phone will show up here.</Text>
      </View>
    );
  }, [status]);

  const ListFooterComponent = useMemo(() => {
    if (!hasNextPage || items.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={DarkTheme.colors.accent} size="small" />
      </View>
    );
  }, [hasNextPage, items.length]);

  return (
    <FlashList
      data={gridData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      numColumns={NUM_COLUMNS}
      overrideItemLayout={(layout, item) => {
        if (item.type === 'header') {
          layout.span = NUM_COLUMNS;
        } else {
          layout.span = 1;
        }
      }}
      onEndReached={onLoadNextPage}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={status === 'refreshing'}
          onRefresh={onRefresh}
          tintColor={DarkTheme.colors.accent}
          colors={[DarkTheme.colors.accent]}
        />
      }
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  tileWrapper: {
    padding: COLUMN_GAP / 2,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.sectionHeader,
    color: DarkTheme.colors.text,
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: DarkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

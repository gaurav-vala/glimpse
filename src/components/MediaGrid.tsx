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
import { DarkTheme, Spacing } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = Spacing.md; // 12dp outer margin
const COLUMN_GAP = 6; // 6dp spacing between floating cards
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1);
const TILE_SIZE = AVAILABLE_WIDTH / NUM_COLUMNS;

type GridItem =
  | { type: 'header'; id: string; title: string; dayItemIds: string[] }
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
  const selectAll = useSelectionStore((s) => s.selectAll);

  // Group items by day for date headers (GRID-6)
  const gridData = useMemo<GridItem[]>(() => {
    const list: GridItem[] = [];
    let currentHeader = '';
    let currentDayIds: string[] = [];
    let currentHeaderIndex = -1;

    for (const item of items) {
      const headerTitle = formatDateHeader(item.creationTime);
      if (headerTitle !== currentHeader) {
        if (currentHeaderIndex >= 0) {
          (list[currentHeaderIndex] as any).dayItemIds = currentDayIds;
        }
        currentHeader = headerTitle;
        currentDayIds = [item.id];
        currentHeaderIndex = list.length;
        list.push({
          type: 'header',
          id: `header-${currentHeader}-${item.id}`,
          title: currentHeader,
          dayItemIds: [],
        });
      } else {
        currentDayIds.push(item.id);
      }
      list.push({
        type: 'tile',
        id: item.id,
        item,
      });
    }

    if (currentHeaderIndex >= 0) {
      (list[currentHeaderIndex] as any).dayItemIds = currentDayIds;
    }

    return list;
  }, [items]);

  const handleTilePress = useCallback(
    (id: string) => {
      const found = items.find((i) => i.id === id);
      if (found) onItemPress(found);
    },
    [items, onItemPress]
  );

  const handleSelectDay = useCallback(
    (ids: string[]) => {
      selectAll([...Array.from(selectedIds), ...ids]);
    },
    [selectAll, selectedIds]
  );

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.type === 'header') {
        return (
          <DateHeader
            title={item.title}
            onSelectAll={isSelectionMode ? () => handleSelectDay(item.dayItemIds) : undefined}
          />
        );
      }

      const media = item.item;

      return (
        <View style={styles.tileWrapper}>
          <MediaTile
            id={media.id}
            uri={media.uri}
            mediaType={media.mediaType}
            duration={media.duration}
            tileSize={TILE_SIZE}
            onPress={handleTilePress}
          />
        </View>
      );
    },
    [isSelectionMode, handleTilePress, handleSelectDay]
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
        <AppIcon icon={Image01Icon} size={48} color={DarkTheme.colors.textMuted} />
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
      drawDistance={1200}
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
    paddingHorizontal: HORIZONTAL_PADDING - COLUMN_GAP / 2,
    paddingBottom: 110, // Generous padding for floating pill tab bar
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
    color: DarkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    color: DarkTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

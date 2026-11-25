import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaItem } from "../features/media/types";
import { useSelectionStore } from "../features/selection/store";
import { DarkTheme, Fonts, Spacing } from "../theme/theme";
import { DateHeader, formatDateHeader } from "./DateHeader";
import { MediaTile } from "./MediaTile";
import { Button } from "./ui/button";
import { AppIcon, Image01Icon } from "./ui/Icon";

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = Spacing.md; // 12dp outer margin
const COLUMN_GAP = 6; // 6dp spacing between floating cards

type GridItem =
  | { type: "header"; id: string; title: string; dayItemIds: string[] }
  | { type: "tile"; id: string; item: MediaItem };

interface MediaGridProps {
  items: MediaItem[];
  status: "idle" | "loading" | "refreshing" | "error";
  hasNextPage: boolean;
  onLoadNextPage: () => void;
  onRefresh: () => void;
  onItemPress: (item: MediaItem, index?: number) => void;
}

export function MediaGrid({
  items,
  status,
  hasNextPage,
  onLoadNextPage,
  onRefresh,
  onItemPress,
}: MediaGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth =
    screenWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1);
  const tileSize = availableWidth / NUM_COLUMNS;

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleGroup = useSelectionStore((s) => s.toggleGroup);

  // Group items by section header for date headers (GRID-6)
  const gridData = useMemo<GridItem[]>(() => {
    const list: GridItem[] = [];
    const headerCounts = new Map<string, number>();
    let currentHeader = "";
    let currentDayIds: string[] = [];
    let currentHeaderIndex = -1;

    for (const item of items) {
      const headerTitle = formatDateHeader(item.creationTime);
      if (headerTitle !== currentHeader) {
        if (currentHeaderIndex >= 0) {
          (
            list[currentHeaderIndex] as Extract<GridItem, { type: "header" }>
          ).dayItemIds = currentDayIds;
        }
        currentHeader = headerTitle;
        const count = (headerCounts.get(currentHeader) ?? 0) + 1;
        headerCounts.set(currentHeader, count);
        currentDayIds = [item.id];
        currentHeaderIndex = list.length;
        list.push({
          type: "header",
          id: `header-${currentHeader}-${count}`,
          title: currentHeader,
          dayItemIds: [],
        });
      } else {
        currentDayIds.push(item.id);
      }
      list.push({
        type: "tile",
        id: item.id,
        item,
      });
    }

    if (currentHeaderIndex >= 0) {
      (
        list[currentHeaderIndex] as Extract<GridItem, { type: "header" }>
      ).dayItemIds = currentDayIds;
    }

    return list;
  }, [items]);

  const handleTilePress = useCallback(
    (id: string) => {
      const foundIndex = items.findIndex((i) => i.id === id);
      if (foundIndex >= 0) {
        onItemPress(items[foundIndex], foundIndex);
      }
    },
    [items, onItemPress],
  );

  const handleSelectDay = useCallback(
    (ids: string[]) => {
      toggleGroup(ids);
    },
    [toggleGroup],
  );

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.type === "header") {
        const allSelected =
          isSelectionMode &&
          item.dayItemIds.length > 0 &&
          item.dayItemIds.every((id) => selectedIds.has(id));
        return (
          <DateHeader
            title={item.title}
            allSelected={allSelected}
            onSelectAll={
              isSelectionMode
                ? () => handleSelectDay(item.dayItemIds)
                : undefined
            }
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
            tileSize={tileSize}
            onPress={handleTilePress}
          />
        </View>
      );
    },
    [isSelectionMode, selectedIds, tileSize, handleTilePress, handleSelectDay],
  );

  const getItemType = useCallback((item: GridItem) => {
    return item.type;
  }, []);

  const keyExtractor = useCallback((item: GridItem) => item.id, []);

  // Empty / Error library state (GRID-8)
  const ListEmptyComponent = useMemo(() => {
    if (status === "loading") {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={DarkTheme.colors.accent} size="large" />
        </View>
      );
    }
    if (status === "error") {
      return (
        <View style={styles.emptyContainer}>
          <AppIcon
            icon={Image01Icon}
            size={48}
            color={DarkTheme.colors.textMuted}
          />
          <Text style={styles.emptyTitle}>{"Couldn't load media"}</Text>
          <Text style={styles.emptySubtitle}>
            There was a problem reading your device library.
          </Text>
          <View style={styles.retryWrapper}>
            <Button
              label="Try Again"
              variant="frosted"
              size="md"
              shape="pill"
              onPress={onRefresh}
            />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <AppIcon
          icon={Image01Icon}
          size={48}
          color={DarkTheme.colors.textMuted}
        />
        <Text style={styles.emptyTitle}>No photos or videos yet</Text>
        <Text style={styles.emptySubtitle}>
          Media taken with your phone will show up here.
        </Text>
      </View>
    );
  }, [status, onRefresh]);

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
      extraData={selectedIds}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      numColumns={NUM_COLUMNS}
      overrideItemLayout={(layout, item) => {
        if (item.type === "header") {
          layout.span = NUM_COLUMNS;
        } else {
          layout.span = 1;
        }
      }}
      drawDistance={350}
      onEndReached={onLoadNextPage}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={status === "refreshing"}
          onRefresh={onRefresh}
          tintColor={DarkTheme.colors.accent}
          colors={[DarkTheme.colors.accent]}
        />
      }
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: Math.max(insets.bottom + 88, 110) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING - COLUMN_GAP / 2,
  },
  tileWrapper: {
    padding: COLUMN_GAP / 2,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingTop: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    color: DarkTheme.colors.text,
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    color: DarkTheme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  retryWrapper: {
    marginTop: Spacing.sm,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});

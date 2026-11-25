import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlbumCard } from './AlbumCard';
import { Button } from './ui/button';
import { AppIcon, Folder01Icon } from './ui/Icon';
import { FAVORITES_ALBUM_ID } from '../app/album/[id]';
import { useFavoritesStore } from '../features/media/favoritesStore';
import { mediaService } from '../features/media/mediaService';
import { Album } from '../features/media/types';
import { DarkTheme, Fonts, Spacing } from '../theme/theme';

const HORIZONTAL_PADDING = Spacing.lg;
const COLUMN_GAP = Spacing.md;

function sortAlbumsList(list: Album[]): Album[] {
  return [...list].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    if (aTitle === 'camera' || aTitle === 'dcim') return -1;
    if (bTitle === 'camera' || bTitle === 'dcim') return 1;
    if (aTitle === 'screenshots') return -1;
    if (bTitle === 'screenshots') return 1;
    if (a.id === FAVORITES_ALBUM_ID) return -1;
    if (b.id === FAVORITES_ALBUM_ID) return 1;
    return (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
  });
}

export function AlbumsFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

  const favoritesMap = useFavoritesStore((s) => s.favoritesMap);

  const [deviceAlbums, setDeviceAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAlbums = useCallback(async (forceInvalidate = false) => {
    const t0 = Date.now();
    try {
      if (forceInvalidate) {
        mediaService.invalidateAlbumCache();
      }
      const list = await mediaService.getAlbums();
      if (!isMountedRef.current) return;
      const listMs = Date.now() - t0;

      // Render album titles and counts immediately instead of blocking behind all cover queries
      setHasError(false);
      setDeviceAlbums(sortAlbumsList(list));
      setLoading(false);

      // On Android, GlimpseMedia.getAlbumsFast() already resolved covers & timestamps in one pass;
      // only fetch individual covers for any album missing a coverUri (e.g. iOS / fallback).
      const missingCovers = list.filter((alb) => !alb.coverUri);
      if (missingCovers.length > 0) {
        const enriched = new Map<string, Album>();
        const BATCH_SIZE = 6;
        for (let i = 0; i < missingCovers.length; i += BATCH_SIZE) {
          if (!isMountedRef.current) return;
          const batch = missingCovers.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (alb) => {
              const coverUri = await mediaService.getAlbumCover(alb.id);
              const coverAssetId = mediaService.albumCoverIdCache.get(alb.id);
              const coverMediaType = mediaService.albumCoverTypeCache.get(alb.id);
              const timestamp = mediaService.albumTimestampCache.get(alb.id) || 0;
              return {
                ...alb,
                coverUri: coverUri || undefined,
                coverAssetId,
                coverMediaType,
                latestTimestamp: timestamp,
              };
            })
          );
          for (const r of results) {
            enriched.set(r.id, r);
          }
          if (isMountedRef.current) {
            const merged = list.map((alb) => enriched.get(alb.id) ?? alb);
            setDeviceAlbums(sortAlbumsList(merged));
          }
        }
      }
      console.log(`[Perf:Albums] count=${list.length} listMs=${listMs} totalMs=${Date.now() - t0}`);
    } catch {
      if (isMountedRef.current) {
        setHasError(true);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (isMountedRef.current) {
        void loadAlbums(false);
      }
    });
    const unsubscribe = mediaService.subscribeToChanges(() => {
      void loadAlbums(true);
    });
    return unsubscribe;
  }, [loadAlbums]);

  const albums = useMemo(() => {
    const favItems = Object.values(favoritesMap).sort((a, b) => b.creationTime - a.creationTime);
    if (favItems.length === 0) return deviceAlbums;
    const favAlbum: Album = {
      id: FAVORITES_ALBUM_ID,
      title: 'Favorites',
      assetCount: favItems.length,
      coverUri: favItems[0].uri,
      coverAssetId: favItems[0].id,
      coverMediaType: favItems[0].mediaType,
      latestTimestamp: favItems[0].creationTime,
    };
    return sortAlbumsList([favAlbum, ...deviceAlbums]);
  }, [deviceAlbums, favoritesMap]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlbums(true);
  }, [loadAlbums]);

  const handleAlbumPress = useCallback(
    (album: Album) => {
      router.push({
        pathname: '/album/[id]',
        params: { id: album.id, title: album.title },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Album }) => (
      <AlbumCard album={item} cardWidth={cardWidth} onPress={handleAlbumPress} />
    ),
    [cardWidth, handleAlbumPress]
  );

  const keyExtractor = useCallback((item: Album) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={DarkTheme.colors.accent} size="large" />
        </View>
      ) : hasError && albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppIcon icon={Folder01Icon} size={46} color={DarkTheme.colors.textMuted} />
          <Text style={styles.emptyTitle}>{"Couldn't load albums"}</Text>
          <Text style={styles.emptySubtitle}>
            There was a problem reading your folders.
          </Text>
          <View style={styles.retryWrapper}>
            <Button
              label="Try Again"
              variant="frosted"
              size="md"
              shape="pill"
              onPress={() => {
                setLoading(true);
                loadAlbums(true);
              }}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 88, 110) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={DarkTheme.colors.accent}
              colors={[DarkTheme.colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AppIcon icon={Folder01Icon} size={46} color={DarkTheme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No albums yet</Text>
              <Text style={styles.emptySubtitle}>
                Photos and screenshots folders will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: DarkTheme.colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: DarkTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryWrapper: {
    marginTop: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.sm,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AlbumCard } from './AlbumCard';
import { mediaService } from '../features/media/mediaService';
import { Album } from '../features/media/types';
import { DarkTheme, Fonts, Spacing } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = Spacing.lg;
const COLUMN_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

export function AlbumsFeed() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlbums = useCallback(async () => {
    try {
      const list = await mediaService.getAlbums();
      const withCovers = await Promise.all(
        list.map(async (alb) => {
          const coverUri = await mediaService.getAlbumCover(alb.id);
          const timestamp = mediaService.albumTimestampCache.get(alb.id) || 0;
          return { ...alb, coverUri: coverUri || undefined, latestTimestamp: timestamp };
        })
      );

      // Sort: Camera first, Screenshots second, then folders with newest media first
      withCovers.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        if (aTitle === 'camera' || aTitle === 'dcim') return -1;
        if (bTitle === 'camera' || bTitle === 'dcim') return 1;
        if (aTitle === 'screenshots') return -1;
        if (bTitle === 'screenshots') return 1;
        return (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
      });

      setAlbums(withCovers);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const list = await mediaService.getAlbums();
        const withCovers = await Promise.all(
          list.map(async (alb) => {
            const coverUri = await mediaService.getAlbumCover(alb.id);
            const timestamp = mediaService.albumTimestampCache.get(alb.id) || 0;
            return { ...alb, coverUri: coverUri || undefined, latestTimestamp: timestamp };
          })
        );

        withCovers.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          if (aTitle === 'camera' || aTitle === 'dcim') return -1;
          if (bTitle === 'camera' || bTitle === 'dcim') return 1;
          if (aTitle === 'screenshots') return -1;
          if (bTitle === 'screenshots') return 1;
          return (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
        });

        if (isMounted) {
          setAlbums(withCovers);
          setLoading(false);
          setRefreshing(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlbums();
  };

  const handleAlbumPress = (album: Album) => {
    router.push({
      pathname: '/album/[id]',
      params: { id: album.id, title: album.title },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={DarkTheme.colors.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={DarkTheme.colors.accent}
              colors={[DarkTheme.colors.accent]}
            />
          }
        >
          <View style={styles.grid}>
            {albums.map((album, index) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={index}
                cardWidth={CARD_WIDTH}
                onPress={handleAlbumPress}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
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
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: 96,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

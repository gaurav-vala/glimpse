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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlbumCard } from '../../components/AlbumCard';
import { mediaService } from '../../features/media/mediaService';
import { Album } from '../../features/media/types';
import { DarkTheme, Palette, Spacing, Fonts } from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = Spacing.lg;
const COLUMN_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;

export default function AlbumsTab() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlbums = useCallback(async () => {
    try {
      const list = await mediaService.getAlbums();
      // Load covers lazily (ALB-2)
      const withCovers = await Promise.all(
        list.map(async (alb) => {
          const coverUri = await mediaService.getAlbumCover(alb.id);
          return { ...alb, coverUri: coverUri || undefined };
        })
      );
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
    mediaService.getAlbums().then(async (list) => {
      const withCovers = await Promise.all(
        list.map(async (alb) => {
          const coverUri = await mediaService.getAlbumCover(alb.id);
          return { ...alb, coverUri: coverUri || undefined };
        })
      );
      if (isMounted) {
        setAlbums(withCovers);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlbums();
  };

  const handleAlbumPress = (album: Album) => {
    // Open album screen (ALB-4)
    router.push({
      pathname: '/viewer',
      params: { source: `album:${album.id}` },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                cardWidth={CARD_WIDTH}
                onPress={handleAlbumPress}
              />
            ))}
          </View>
        </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: DarkTheme.colors.text,
    letterSpacing: -0.6,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 80,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

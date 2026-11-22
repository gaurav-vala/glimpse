import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Album } from '../features/media/types';
import { DarkTheme, Fonts, Spacing, Radius } from '../theme/theme';
import { PressableScale } from './ui/pressable-scale';

interface AlbumCardProps {
  album: Album;
  cardWidth: number;
  index?: number;
  onPress: (album: Album) => void;
}

/**
 * AlbumCard (ALB-1, ALB-2)
 * 2-column grid of rounded squircle cover cards (radius 18),
 * with album title and item count, press scale animation, and entrance animation.
 */
export const AlbumCard = memo(function AlbumCard({
  album,
  cardWidth,
  index = 0,
  onPress,
}: AlbumCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 35, 300)).duration(240).springify()}
      style={[styles.container, { width: cardWidth }]}
    >
      <PressableScale
        haptic
        scaleTo={0.96}
        onPress={() => onPress(album)}
        accessibilityRole="button"
        accessibilityLabel={`Album ${album.title}`}
      >
        <View style={[styles.coverWrapper, { width: cardWidth, height: cardWidth }]}>
          {album.coverUri ? (
            <Image
              source={{ uri: album.coverUri }}
              style={styles.coverImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.placeholderCover} />
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {album.title}
        </Text>
        <Text style={styles.count}>{album.assetCount} items</Text>
      </PressableScale>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  coverWrapper: {
    borderRadius: Radius.lg, // 18dp rounded squircle
    overflow: 'hidden',
    backgroundColor: DarkTheme.colors.tilePlaceholder,
    marginBottom: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: DarkTheme.colors.tilePlaceholder,
  },
  title: {
    fontFamily: Fonts.semiBold,
    color: DarkTheme.colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  count: {
    fontFamily: Fonts.medium,
    color: DarkTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
});

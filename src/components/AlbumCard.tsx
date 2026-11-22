import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Album } from '../features/media/types';
import { DarkTheme, Typography, Spacing } from '../theme/theme';

interface AlbumCardProps {
  album: Album;
  cardWidth: number;
  onPress: (album: Album) => void;
}

/**
 * AlbumCard (ALB-1, ALB-2)
 * 2-column grid of rounded cover tiles (radius 12),
 * with album title and item count.
 */
export const AlbumCard = memo(function AlbumCard({
  album,
  cardWidth,
  onPress,
}: AlbumCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      activeOpacity={0.8}
      onPress={() => onPress(album)}
    >
      <View style={[styles.coverWrapper, { width: cardWidth, height: cardWidth }]}>
        {album.coverUri ? (
          <Image
            source={{ uri: album.coverUri }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : (
          <View style={styles.placeholderCover} />
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {album.title}
      </Text>
      <Text style={styles.count}>{album.assetCount} items</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  coverWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: DarkTheme.colors.tilePlaceholder,
    marginBottom: Spacing.xs,
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
    ...Typography.label,
    color: DarkTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  count: {
    ...Typography.caption,
    color: DarkTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
});

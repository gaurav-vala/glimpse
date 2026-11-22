import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon, PlayIcon, Tick02Icon } from './ui/Icon';
import { DarkTheme, Typography, Radius } from '../theme/theme';

interface MediaTileProps {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
  duration: number;
  tileSize: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * MediaTile
 * RULE: Memoized and consumes only primitive props to avoid re-rendering entire grid
 * when a single tile's selection changes.
 */
export const MediaTile = memo(function MediaTile({
  id,
  uri,
  mediaType,
  duration,
  tileSize,
  isSelectionMode,
  isSelected,
  onPress,
  onLongPress,
}: MediaTileProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: tileSize, height: tileSize },
      ]}
      activeOpacity={0.75}
      onPress={() => onPress(id)}
      onLongPress={() => onLongPress(id)}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        recyclingKey={id}
        cachePolicy="memory-disk"
        transition={0}
      />

      {/* Video duration badge & play glyph (GRID-4) */}
      {mediaType === 'video' && (
        <View style={styles.videoBadge}>
          <AppIcon icon={PlayIcon} size={10} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.videoDurationText}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* Selection Overlay (SEL-3) */}
      {isSelectionMode && (
        <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
          <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
            {isSelected && (
              <AppIcon icon={Tick02Icon} size={12} color="#FFFFFF" strokeWidth={2.8} />
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: DarkTheme.colors.tilePlaceholder,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  videoDurationText: {
    ...Typography.badge,
    color: '#FFFFFF',
    fontSize: 10,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    padding: 6,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  selectedOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: DarkTheme.colors.accent,
    borderColor: DarkTheme.colors.accent,
  },
});

import React, { memo, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AppIcon, PlayIcon, Tick02Icon } from './ui/Icon';
import { DarkTheme, Typography, Radius } from '../theme/theme';
import { useSelectionStore } from '../features/selection/store';

interface MediaTileProps {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
  duration: number;
  tileSize: number;
  onPress: (id: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * MediaTile
 * Modern squircle tile with rounded corners (radius 14),
 * subtle border, and sleek frosted video badge.
 * Subscribes internally to selection state for maximum FlashList virtualization performance.
 */
export const MediaTile = memo(function MediaTile({
  id,
  uri,
  mediaType,
  duration,
  tileSize,
  onPress,
}: MediaTileProps) {
  const isSelected = useSelectionStore((s) => s.selectedIds.has(id));
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const toggleItem = useSelectionStore((s) => s.toggleItem);
  const enterSelectionMode = useSelectionStore((s) => s.enterSelectionMode);

  const handlePress = useCallback(() => {
    if (isSelectionMode) {
      toggleItem(id);
    } else {
      onPress(id);
    }
  }, [id, isSelectionMode, toggleItem, onPress]);

  const handleLongPress = useCallback(() => {
    if (!isSelectionMode) {
      enterSelectionMode(id);
    } else {
      toggleItem(id);
    }
  }, [id, isSelectionMode, enterSelectionMode, toggleItem]);

  return (
    <Pressable
      style={[
        styles.container,
        { width: tileSize, height: tileSize },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <Image
        source={{ uri }}
        recyclingKey={id}
        style={[styles.image, { width: tileSize, height: tileSize }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="low"
        transition={100}
      />

      {/* Video duration badge & play glyph (GRID-4) */}
      {mediaType === 'video' && (
        <View style={styles.videoBadge}>
          <AppIcon icon={PlayIcon} size={9} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.videoDurationText}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* Selection Overlay (SEL-3) */}
      {isSelectionMode && (
        <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
          <AnimatedCheckCircle isSelected={isSelected} />
        </View>
      )}
    </Pressable>
  );
});

function AnimatedCheckCircle({ isSelected }: { isSelected: boolean }) {
  const scale = useSharedValue(isSelected ? 1 : 0.7);

  useEffect(() => {
    if (isSelected) {
      scale.value = 0.6;
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
    } else {
      scale.value = 0.7;
    }
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.checkCircle,
        isSelected && styles.checkCircleSelected,
        animatedStyle,
      ]}
    >
      {isSelected && (
        <AppIcon icon={Tick02Icon} size={11} color="#FFFFFF" strokeWidth={3} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md, // 14dp squircle
    backgroundColor: DarkTheme.colors.tilePlaceholder,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  videoDurationText: {
    ...Typography.badge,
    color: '#FFFFFF',
    fontSize: 9.5,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    padding: 6,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  selectedOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: DarkTheme.colors.accent,
    borderColor: DarkTheme.colors.accent,
  },
});

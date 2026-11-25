import { Image } from "expo-image";
import { memo, useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Album } from "../features/media/types";
import { useVideoThumbnail } from "../features/media/videoThumbnailService";
import { DarkTheme, Fonts, Radius, Spacing } from "../theme/theme";
import { AppIcon, PlayIcon } from "./ui/Icon";
import { PressableScale } from "./ui/pressable-scale";

interface AlbumCardProps {
  album: Album;
  cardWidth: number;
  onPress: (album: Album) => void;
}

/**
 * AlbumCard (ALB-1, ALB-2)
 * 2-column grid of rounded squircle cover cards (radius 18),
 * with album title and item count and press scale animation.
 */
export const AlbumCard = memo(function AlbumCard({
  album,
  cardWidth,
  onPress,
}: AlbumCardProps) {
  const isVideoCover = album.coverMediaType === "video";
  const displayCoverUri = useVideoThumbnail(
    album.coverAssetId ?? album.id,
    album.coverUri,
    isVideoCover,
    384
  );

  const loadStartRef = useRef<number>(0);

  const handleLoadStart = useCallback(() => {
    loadStartRef.current = Date.now();
  }, []);

  const handleLoad = useCallback(
    (e: { source?: { width?: number; height?: number } }) => {
      if (!loadStartRef.current) return;
      const ms = Date.now() - loadStartRef.current;
      if (ms > 350) {
        console.warn(
          `[Perf:AlbumCoverSlow] title=${album.title} ms=${ms} src=${e.source?.width ?? 0}x${e.source?.height ?? 0}`
        );
      }
    },
    [album.title]
  );

  const handleError = useCallback(
    (e: { error?: string }) => {
      console.warn(
        `[Perf:AlbumCoverError] title=${album.title} uri=${album.coverUri} err=${e.error}`
      );
    },
    [album.title, album.coverUri]
  );

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      <PressableScale
        haptic
        scaleTo={0.96}
        onPress={() => onPress(album)}
        accessibilityRole="button"
        accessibilityLabel={`Album ${album.title}`}
      >
        <View style={[styles.coverWrapper, { width: cardWidth, height: cardWidth }]}>
          {displayCoverUri ? (
            <Image
              source={{ uri: displayCoverUri, width: 384, height: 384 }}
              recyclingKey={album.id}
              style={styles.coverImage}
              contentFit="cover"
              decodeFormat="rgb"
              cachePolicy={isVideoCover ? 'memory' : 'memory-disk'}
              priority="normal"
              transition={0}
              onLoadStart={handleLoadStart}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <View style={styles.placeholderCover}>
              {isVideoCover && (
                <View style={styles.placeholderVideoBadge}>
                  <AppIcon
                    icon={PlayIcon}
                    size={22}
                    color="rgba(255, 255, 255, 0.55)"
                    strokeWidth={2}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {album.title}
        </Text>
        <Text style={styles.count}>
          {album.assetCount} {album.assetCount === 1 ? 'item' : 'items'}
        </Text>
      </PressableScale>
    </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderVideoBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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

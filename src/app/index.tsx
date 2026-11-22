import React, { useEffect, useState, useTransition } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { mediaService } from '../features/media/mediaService';
import { MediaItem, PermissionStatusResult } from '../features/media/types';
import { DarkTheme, Palette, Typography, Spacing, Radius } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - COLUMN_GAP * 2) / 3;

export default function Phase0SpikeScreen() {
  const [permission, setPermission] = useState<PermissionStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [benchTimeMs, setBenchTimeMs] = useState<number | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedPreview, setSelectedPreview] = useState<MediaItem | null>(null);
  const [, startTransition] = useTransition();

  // Gesture shared values for zoom spike (Spike 5)
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const fetchItems = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await mediaService.getMediaPage({
        first: 90,
        cameraOnly: true, // Scoped to Camera album
      });
      const duration = Math.round(performance.now() - start);
      setBenchTimeMs(duration);
      startTransition(() => {
        setItems(res.items);
        setTotalCount(res.totalCount);
        if (res.items.length > 0) {
          setSelectedPreview(res.items[0]);
        }
      });
    } catch (err: any) {
      Alert.alert('Fetch Error', err?.message || 'Could not fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    mediaService.checkPermissions().then((res) => {
      if (isMounted) {
        setPermission(res);
        if (res.granted) {
          fetchItems();
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestPermissions = async () => {
    const res = await mediaService.requestPermissions();
    setPermission(res);
    if (res.granted) {
      fetchItems();
    }
  };

  const handleSimulateAdd = () => {
    mediaService.simulateAddPhoto();
    fetchItems();
  };

  const handleDeleteItem = async (item: MediaItem) => {
    try {
      await mediaService.deleteAssets([item.id]);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (selectedPreview?.id === item.id) {
        setSelectedPreview(null);
      }
      Alert.alert('Deleted', `Removed ${item.filename}`);
    } catch (err: any) {
      Alert.alert('Delete Error', err?.message);
    }
  };

  // Format duration into m:ss
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Reanimated 4 Pinch Gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      }
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const animatedPreviewStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const composedGesture = Gesture.Simultaneous(pinchGesture, doubleTapGesture);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseBadgeText}>
                {mediaService.isDemoMode ? 'EXPO GO DEMO MODE' : 'NATIVE MEDIA MODE'}
              </Text>
            </View>
            <Text style={styles.brandSubtitle}>Moto Edge / Android 14</Text>
          </View>
          <Text style={styles.title}>Luma Gallery</Text>
        </View>

        {/* Demo Mode Notice Banner for Expo Go */}
        {mediaService.isDemoMode && (
          <View style={styles.noticeBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#60A5FA" />
            <Text style={styles.noticeText}>
              Running inside Expo Go. Using high-fidelity demo library (60 Camera items, Videos, Albums). 
              A release APK (`build:apk`) accesses real device media.
            </Text>
          </View>
        )}

        {/* Spike 1: Permissions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={permission?.granted ? 'shield-checkmark' : 'shield-outline'}
              size={20}
              color={permission?.granted ? Palette.success : Palette.warning}
            />
            <Text style={styles.cardTitle}>Spike 1: Granular Permissions</Text>
          </View>
          <Text style={styles.cardDesc}>
            Target: Request photo & video granular permissions together. Zero audio access requested.
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text
              style={[
                styles.statusValue,
                { color: permission?.granted ? Palette.success : Palette.destructive },
              ]}
            >
              {permission?.granted
                ? `Granted (${mediaService.isDemoMode ? 'Demo Simulator' : 'Native OS'})`
                : permission?.status || 'Undetermined'}
            </Text>
          </View>

          {!permission?.granted && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRequestPermissions}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Request Photo & Video Access</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spike 2: Benchmark & Pagination */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="speedometer-outline" size={20} color={DarkTheme.colors.accent} />
            <Text style={styles.cardTitle}>Spike 2: 90-Item Page Retrieval</Text>
          </View>
          <Text style={styles.cardDesc}>
            Target: Fetch 90 assets through MediaStore cursor in under 200 ms.
          </Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>
                {benchTimeMs !== null ? `${benchTimeMs}ms` : '--'}
              </Text>
              <Text style={styles.metricLabel}>Fetch Time (&lt;200ms)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{items.length}</Text>
              <Text style={styles.metricLabel}>Items Loaded</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{totalCount || '--'}</Text>
              <Text style={styles.metricLabel}>Total in Folder</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }, loading && styles.buttonDisabled]}
              onPress={fetchItems}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Re-fetch 90 Assets</Text>
              )}
            </TouchableOpacity>

            {mediaService.isDemoMode && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSimulateAdd}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>Simulate Camera Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Spike 5: Zoom & Gesture Worklet Test */}
        {selectedPreview && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="finger-print-outline" size={20} color={DarkTheme.colors.accent} />
              <Text style={styles.cardTitle}>Spike 5: Reanimated 4 Zoom & Pan</Text>
            </View>
            <Text style={styles.cardDesc}>
              Double-tap to toggle zoom (1x / 2.5x), or pinch to zoom up to 5x. Running 100% on UI thread.
            </Text>

            <View style={styles.zoomContainer}>
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.zoomView, animatedPreviewStyle]}>
                  <Image
                    source={{ uri: selectedPreview.uri }}
                    style={styles.zoomImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </Animated.View>
              </GestureDetector>
            </View>
            <Text style={styles.previewMeta}>
              Selected: {selectedPreview.filename} ({selectedPreview.mediaType})
            </Text>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteItem(selectedPreview)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Test Delete Selected Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spike 3 & Grid Preview */}
        {items.length > 0 && (
          <View style={styles.gridSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>DCIM / Camera Grid ({items.length} items)</Text>
              <Text style={styles.sectionCount}>Tap to zoom</Text>
            </View>

            <View style={styles.grid}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.tile,
                    {
                      marginRight: (index + 1) % 3 === 0 ? 0 : COLUMN_GAP,
                      marginBottom: COLUMN_GAP,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPreview(item)}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.tileImage}
                    contentFit="cover"
                    recyclingKey={item.id}
                    cachePolicy="memory-disk"
                    transition={0}
                  />

                  {/* Video duration badge & play glyph (GRID-4) */}
                  {item.mediaType === 'video' && (
                    <View style={styles.videoBadge}>
                      <Ionicons name="play" size={10} color="#FFFFFF" style={styles.playIcon} />
                      <Text style={styles.videoDurationText}>
                        {formatDuration(item.duration)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  phaseBadge: {
    backgroundColor: Palette.accentBlueSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  phaseBadgeText: {
    ...Typography.badge,
    color: '#60A5FA',
    fontSize: 10,
  },
  brandSubtitle: {
    ...Typography.caption,
    color: DarkTheme.colors.textSecondary,
  },
  title: {
    ...Typography.largeTitle,
    color: DarkTheme.colors.text,
  },
  noticeBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noticeText: {
    ...Typography.caption,
    color: '#93C5FD',
    flex: 1,
    lineHeight: 18,
  },
  card: {
    backgroundColor: DarkTheme.colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: DarkTheme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    ...Typography.sectionHeader,
    color: DarkTheme.colors.text,
  },
  cardDesc: {
    ...Typography.caption,
    color: DarkTheme.colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  statusLabel: {
    ...Typography.body,
    color: DarkTheme.colors.textSecondary,
  },
  statusValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: DarkTheme.colors.accent,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: DarkTheme.colors.surfaceElevated,
    borderColor: DarkTheme.colors.borderStrong,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  secondaryButtonText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: DarkTheme.colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: DarkTheme.colors.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: DarkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  zoomContainer: {
    height: 220,
    backgroundColor: Palette.black,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomView: {
    width: '100%',
    height: '100%',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  previewMeta: {
    ...Typography.caption,
    color: DarkTheme.colors.textDim,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: DarkTheme.colors.destructiveSoft,
    borderRadius: Radius.sm,
  },
  deleteButtonText: {
    ...Typography.caption,
    color: '#EF4444',
    fontWeight: '600',
  },
  gridSection: {
    marginTop: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.sectionHeader,
    color: DarkTheme.colors.text,
  },
  sectionCount: {
    ...Typography.caption,
    color: DarkTheme.colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: DarkTheme.colors.tilePlaceholder,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  playIcon: {
    marginRight: 1,
  },
  videoDurationText: {
    ...Typography.badge,
    color: '#FFFFFF',
    fontSize: 10,
  },
});

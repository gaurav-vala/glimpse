import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { mediaService } from '../features/media/mediaService';
import { MediaItem } from '../features/media/types';
import {
  AppIcon,
  Calendar03Icon,
  File02Icon,
  Image01Icon,
  Time01Icon,
  Video01Icon,
} from './ui/Icon';
import { Popup } from './ui/popup';
import { DarkTheme, Fonts, Spacing } from '../theme/theme';

// Hoisted Intl formatter to prevent recreation on render (js-hoist-intl)
const infoDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface InfoSheetProps {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InfoSheet({ item, visible, onClose }: InfoSheetProps) {
  const [resolvedSize, setResolvedSize] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!visible || !item) return;

    (async () => {
      try {
        let localFileUri = item.fileUri?.startsWith('file://')
          ? item.fileUri
          : item.uri.startsWith('file://')
          ? item.uri
          : null;

        if (!localFileUri && !mediaService.isDemoMode) {
          const assetInfo = await mediaService.getAssetInfo(item.id);
          if (assetInfo?.localUri?.startsWith('file://')) {
            localFileUri = assetInfo.localUri;
          }
        }

        if (localFileUri) {
          const info = await FileSystem.getInfoAsync(localFileUri);
          if (isMounted && info.exists && 'size' in info && typeof info.size === 'number') {
            setResolvedSize({ id: item.id, text: formatBytes(info.size) });
            return;
          }
        }
      } catch {
        // Fallback below
      }
      if (isMounted) {
        setResolvedSize({ id: item.id, text: 'Available locally' });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, item]);

  const fileSizeText =
    resolvedSize && resolvedSize.id === item.id ? resolvedSize.text : 'Available locally';

  const dateStr = infoDateFormatter.format(new Date(item.creationTime));

  const megapixels =
    item.width > 0 && item.height > 0
      ? ((item.width * item.height) / 1000000).toFixed(1)
      : null;

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title="Details"
      subtitle={item.filename || (item.mediaType === 'video' ? 'Video asset' : 'Photo asset')}
      maxHeightPercent={0.75}
    >
      <View style={styles.content}>
        {/* Unified Minimal Inset Group */}
        <View style={styles.groupCard}>
          <InfoRow
            icon={File02Icon}
            label="File Name"
            value={item.filename || 'Unknown'}
          />

          <View style={styles.divider} />

          <InfoRow
            icon={Calendar03Icon}
            label="Date Taken"
            value={dateStr}
          />

          <View style={styles.divider} />

          <InfoRow
            icon={item.mediaType === 'video' ? Video01Icon : Image01Icon}
            label="Resolution"
            value={
              item.width > 0 && item.height > 0
                ? `${item.width} × ${item.height}${megapixels ? ` (${megapixels} MP)` : ''}`
                : 'Standard resolution'
            }
          />

          <View style={styles.divider} />

          <InfoRow
            icon={File02Icon}
            label="File Size"
            value={fileSizeText}
          />

          {item.mediaType === 'video' && (
            <>
              <View style={styles.divider} />
              <InfoRow
                icon={Time01Icon}
                label="Duration"
                value={`${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s`}
              />
            </>
          )}

          <View style={styles.divider} />

          <InfoRow
            icon={item.mediaType === 'video' ? Video01Icon : Image01Icon}
            label="Type"
            value={item.mediaType === 'video' ? 'Video' : 'Photo'}
          />
        </View>
      </View>
    </Popup>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <AppIcon icon={icon} size={17} color={DarkTheme.colors.textMuted} strokeWidth={1.8} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.xs,
  },
  groupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: Spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flexShrink: 0,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    color: DarkTheme.colors.textMuted,
    letterSpacing: -0.1,
  },
  value: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: DarkTheme.colors.text,
    textAlign: 'right',
    flex: 1,
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

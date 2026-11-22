import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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

interface InfoSheetProps {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}

export function InfoSheet({ item, visible, onClose }: InfoSheetProps) {
  const [fileSizeText, setFileSizeText] = useState<string>('Available locally');

  useEffect(() => {
    let isMounted = true;
    if (visible && item && item.uri.startsWith('file://')) {
      FileSystem.getInfoAsync(item.uri)
        .then((info) => {
          if (
            isMounted &&
            info.exists &&
            'size' in info &&
            typeof info.size === 'number'
          ) {
            const mb = (info.size / (1024 * 1024)).toFixed(1);
            setFileSizeText(`${mb} MB`);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [visible, item]);

  const dateStr = new Date(item.creationTime).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
      <Text style={styles.value} numberOfLines={2}>
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

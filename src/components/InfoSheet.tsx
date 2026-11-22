import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { MediaItem } from '../features/media/types';
import { AppIcon, Calendar03Icon, File02Icon, Image02Icon, Time01Icon, Video02Icon } from './ui/Icon';
import { Popup } from './ui/popup';
import { DarkTheme, Fonts, Palette, Radius, Spacing } from '../theme/theme';

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
      FileSystem.getInfoAsync(item.uri).then((info) => {
        if (isMounted && info.exists && 'size' in info && typeof info.size === 'number') {
          const mb = (info.size / (1024 * 1024)).toFixed(1);
          setFileSizeText(`${mb} MB`);
        }
      }).catch(() => {});
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

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      title="Details"
      subtitle={item.filename || (item.mediaType === 'video' ? 'Video asset' : 'Photo asset')}
      maxHeightPercent={0.75}
    >
      <View style={styles.detailsList}>
        <InfoTile
          icon={File02Icon}
          label="File name"
          value={item.filename || 'Unknown'}
        />

        <InfoTile
          icon={Calendar03Icon}
          label="Date taken"
          value={dateStr}
        />

        <InfoTile
          icon={item.mediaType === 'video' ? Video02Icon : Image02Icon}
          label="Resolution"
          value={
            item.width > 0 && item.height > 0
              ? `${item.width} × ${item.height} (${(
                  (item.width * item.height) /
                  1000000
                ).toFixed(1)} MP)`
              : 'Standard resolution'
          }
        />

        <InfoTile
          icon={File02Icon}
          label="File size"
          value={fileSizeText}
        />

        {item.mediaType === 'video' && (
          <InfoTile
            icon={Time01Icon}
            label="Duration"
            value={`${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s`}
          />
        )}

        <InfoTile
          icon={item.mediaType === 'video' ? Video02Icon : Image02Icon}
          label="Type"
          value={item.mediaType === 'video' ? 'Video' : 'Photo'}
        />
      </View>
    </Popup>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIconContainer}>
        <AppIcon icon={icon} size={16} color={DarkTheme.colors.accent} />
      </View>
      <View style={styles.tileTextContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsList: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceElevated, // #1C1C20
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Palette.accentBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tileTextContainer: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: DarkTheme.colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: DarkTheme.colors.text,
  },
});

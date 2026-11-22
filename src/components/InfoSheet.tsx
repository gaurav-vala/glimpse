import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { MediaItem } from '../features/media/types';
import { AppIcon, Cancel01Icon, InformationCircleIcon } from './ui/Icon';
import { DarkTheme, Fonts, Radius, Spacing } from '../theme/theme';

interface InfoSheetProps {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}

export function InfoSheet({ item, visible, onClose }: InfoSheetProps) {
  const insets = useSafeAreaInsets();
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <AppIcon icon={InformationCircleIcon} size={20} color={DarkTheme.colors.accent} />
                  <Text style={styles.title}>Details</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <AppIcon icon={Cancel01Icon} size={20} color={DarkTheme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Rows */}
              <View style={styles.detailsList}>
                <InfoRow label="File name" value={item.filename || 'Unknown'} />
                <InfoRow label="Date taken" value={dateStr} />
                <InfoRow
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
                <InfoRow label="File size" value={fileSizeText} />
                {item.mediaType === 'video' && (
                  <InfoRow
                    label="Duration"
                    value={`${Math.floor(item.duration / 60)}m ${Math.floor(item.duration % 60)}s`}
                  />
                )}
                <InfoRow label="Type" value={item.mediaType === 'video' ? 'Video' : 'Photo'} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161619',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: DarkTheme.colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  detailsList: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rowLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: DarkTheme.colors.textMuted,
    minWidth: 90,
  },
  rowValue: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: DarkTheme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
});

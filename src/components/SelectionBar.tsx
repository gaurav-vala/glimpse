import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppIcon,
  Cancel01Icon,
  Delete02Icon,
  Share01Icon,
} from './ui/Icon';
import { DarkTheme, Palette, Typography, Spacing, Radius } from '../theme/theme';

interface SelectionTopBarProps {
  selectedCount: number;
  onClose: () => void;
}

interface SelectionBottomBarProps {
  selectedCount: number;
  onDelete: () => void;
  onShare?: () => void;
  isDeleting?: boolean;
}

export function SelectionTopBar({ selectedCount, onClose }: SelectionTopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }]}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <AppIcon icon={Cancel01Icon} size={22} color={DarkTheme.colors.text} />
      </TouchableOpacity>

      <Text style={styles.topBarTitle}>
        {selectedCount} selected
      </Text>

      <View style={styles.placeholderButton} />
    </View>
  );
}

export function SelectionBottomBar({
  selectedCount,
  onDelete,
  onShare,
  isDeleting,
}: SelectionBottomBarProps) {
  const insets = useSafeAreaInsets();

  const confirmDelete = () => {
    Alert.alert(
      'Delete Media',
      `Delete ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Share (only available when exactly 1 item selected) (SEL-4) */}
      {selectedCount === 1 && onShare ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <AppIcon icon={Share01Icon} size={20} color={DarkTheme.colors.text} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyAction} />
      )}

      {/* Delete (DEL-2) */}
      <TouchableOpacity
        style={[styles.actionButton, isDeleting && styles.actionDisabled]}
        onPress={confirmDelete}
        disabled={isDeleting || selectedCount === 0}
        activeOpacity={0.7}
      >
        <AppIcon icon={Delete02Icon} size={20} color={Palette.destructive} />
        <Text style={[styles.actionButtonText, { color: Palette.destructive }]}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(12, 13, 17, 0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DarkTheme.colors.border,
  },
  topBarTitle: {
    ...Typography.sectionHeader,
    color: DarkTheme.colors.text,
    fontSize: 16,
  },
  iconButton: {
    padding: Spacing.xs,
    borderRadius: Radius.round,
  },
  placeholderButton: {
    width: 32,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(12, 13, 17, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DarkTheme.colors.border,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
  },
  emptyAction: {
    minWidth: 64,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...Typography.caption,
    color: DarkTheme.colors.text,
    fontSize: 11,
    fontWeight: '500',
  },
});

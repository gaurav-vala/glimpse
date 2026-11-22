import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideInUp } from 'react-native-reanimated';
import {
  AppIcon,
  Cancel01Icon,
  Delete02Icon,
  Share01Icon,
} from './ui/Icon';
import { ConfirmPopup } from './ui/popup';
import { DarkTheme, Palette, Spacing } from '../theme/theme';

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
    <Animated.View
      entering={SlideInUp.duration(220)}
      style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }]}
    >
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
    </Animated.View>
  );
}

export function SelectionBottomBar({
  selectedCount,
  onDelete,
  onShare,
  isDeleting,
}: SelectionBottomBarProps) {
  const insets = useSafeAreaInsets();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Animated.View
        entering={SlideInDown.duration(220)}
        style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
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

        {/* Delete button triggering popup (DEL-2) */}
        <TouchableOpacity
          style={[styles.actionButton, isDeleting && styles.actionDisabled]}
          onPress={() => setConfirmOpen(true)}
          disabled={isDeleting || selectedCount === 0}
          activeOpacity={0.7}
        >
          <AppIcon icon={Delete02Icon} size={20} color={Palette.destructive} />
          <Text style={[styles.actionButtonText, { color: Palette.destructive }]}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Modern OLED Confirm Popup */}
      <ConfirmPopup
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Media?"
        subtitle={`Delete ${selectedCount} ${selectedCount === 1 ? 'selected item' : 'selected items'} from device storage? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 50,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderButton: {
    width: 40,
  },
  topBarTitle: {
    color: DarkTheme.colors.text,
    fontSize: 16,
    fontFamily: DarkTheme.colors.text ? 'PlusJakartaSans-SemiBold' : undefined,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Spacing.md,
    zIndex: 50,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionButtonText: {
    color: DarkTheme.colors.text,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyAction: {
    width: 60,
  },
});

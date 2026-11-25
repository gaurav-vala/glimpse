import React, { useState } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  AppIcon,
  Cancel01Icon,
  Delete02Icon,
  Share01Icon,
} from './ui/Icon';
import { ConfirmPopup } from './ui/popup';
import { PressableScale } from './ui/pressable-scale';
import { mediaService } from '../features/media/mediaService';
import { DarkTheme, Fonts, Palette, Radius, Spacing } from '../theme/theme';

interface SelectionTopBarProps {
  selectedCount: number;
  allSelected?: boolean;
  onClose: () => void;
  onSelectAll?: () => void;
}

interface SelectionBottomBarProps {
  selectedCount: number;
  onDelete: () => void;
  onShare?: () => void;
  isDeleting?: boolean;
}

export function SelectionTopBar({
  selectedCount,
  allSelected = false,
  onClose,
  onSelectAll,
}: SelectionTopBarProps) {
  // Parent screens already wrap content in <SafeAreaView edges={['top']}>; avoid double top inset jump
  return (
    <Animated.View
      entering={FadeInUp.duration(180)}
      style={[styles.topBar, { paddingTop: Spacing.xs }]}
    >
      <PressableScale
        haptic
        scaleTo={0.9}
        style={styles.circleButton}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Exit selection"
      >
        <AppIcon icon={Cancel01Icon} size={18} color={DarkTheme.colors.text} strokeWidth={2.2} />
      </PressableScale>

      <View style={styles.pillBadge}>
        <Text style={styles.topBarTitle}>
          {selectedCount} selected
        </Text>
      </View>

      {onSelectAll ? (
        <PressableScale
          haptic
          scaleTo={0.92}
          style={styles.selectAllBtn}
          onPress={onSelectAll}
          accessibilityRole="button"
          accessibilityLabel={allSelected ? 'Clear selection' : 'Select all'}
        >
          <Text style={styles.selectAllText}>{allSelected ? 'Clear' : 'All'}</Text>
        </PressableScale>
      ) : (
        <View style={styles.placeholderButton} />
      )}
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

  const handleDeletePress = () => {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 30 && !mediaService.isDemoMode) {
      onDelete();
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      {/* Floating Frosted Action Pill */}
      <View
        style={[
          styles.floatingWrapper,
          { bottom: Math.max(insets.bottom + 8, 16) },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={styles.floatingPill}
        >
          {/* Share (available when 1 item selected) */}
          {selectedCount === 1 && onShare ? (
            <>
              <PressableScale
                haptic
                scaleTo={0.92}
                style={styles.pillAction}
                onPress={onShare}
                accessibilityRole="button"
                accessibilityLabel="Share selected item"
              >
                <AppIcon icon={Share01Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.pillActionText}>Share</Text>
              </PressableScale>

              <View style={styles.verticalDivider} />
            </>
          ) : null}

          {/* Delete Action Button */}
          <PressableScale
            haptic
            scaleTo={0.92}
            style={[styles.pillAction, isDeleting && styles.actionDisabled]}
            onPress={handleDeletePress}
            disabled={isDeleting || selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedCount} items`}
          >
            <AppIcon icon={Delete02Icon} size={18} color={Palette.destructive} strokeWidth={2} />
            <Text style={[styles.pillActionText, { color: Palette.destructive }]}>
              {isDeleting ? 'Deleting...' : selectedCount > 1 ? `Delete (${selectedCount})` : 'Delete'}
            </Text>
          </PressableScale>
        </Animated.View>
      </View>

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
    paddingBottom: Spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 50,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderButton: {
    width: 38,
  },
  pillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  topBarTitle: {
    color: DarkTheme.colors.text,
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    letterSpacing: -0.2,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectAllText: {
    fontFamily: Fonts.semiBold,
    color: DarkTheme.colors.accent,
    fontSize: 12.5,
  },
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.surfacePill,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: DarkTheme.colors.pillBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 46,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  pillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  pillActionText: {
    fontFamily: Fonts.semiBold,
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: -0.2,
  },
  verticalDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  actionDisabled: {
    opacity: 0.4,
  },
});

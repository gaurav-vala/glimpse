import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DarkTheme, Fonts, Spacing } from '../theme/theme';
import { PressableScale } from './ui/pressable-scale';

interface DateHeaderProps {
  title: string;
  onSelectAll?: () => void;
}

// Hoisted static formatters to avoid expensive re-instantiation in loops (js-hoist-intl)
const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const monthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

/**
 * Format timestamp into human header:
 * "Today", "Yesterday", "Mon, 3 Nov", or "October 2025" (GRID-6).
 */
export function formatDateHeader(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 30) {
    return shortDateFormatter.format(date);
  }

  return monthYearFormatter.format(date);
}

export const DateHeader = memo(function DateHeader({ title, onSelectAll }: DateHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onSelectAll && (
        <PressableScale
          haptic
          scaleTo={0.92}
          onPress={onSelectAll}
          style={styles.selectButton}
          accessibilityRole="button"
          accessibilityLabel={`Select all photos from ${title}`}
        >
          <Text style={styles.selectText}>Select</Text>
        </PressableScale>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: DarkTheme.colors.background,
  },
  title: {
    fontFamily: Fonts.semiBold,
    color: DarkTheme.colors.textMuted,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  selectButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  selectText: {
    fontFamily: Fonts.medium,
    color: DarkTheme.colors.accent,
    fontSize: 12.5,
  },
});

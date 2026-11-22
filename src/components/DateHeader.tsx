import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DarkTheme, Typography, Spacing } from '../theme/theme';

interface DateHeaderProps {
  title: string;
}

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
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export const DateHeader = memo(function DateHeader({ title }: DateHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: DarkTheme.colors.background,
  },
  text: {
    ...Typography.sectionHeader,
    color: DarkTheme.colors.textSecondary,
    fontSize: 13,
    letterSpacing: -0.1,
  },
});

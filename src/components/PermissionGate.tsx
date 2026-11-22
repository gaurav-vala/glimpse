import React from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { AppIcon, Shield01Icon } from './ui/Icon';
import { DarkTheme, Palette, Typography, Spacing, Radius } from '../theme/theme';

interface PermissionGateProps {
  canAskAgain: boolean;
  onRequestAccess: () => void;
}

/**
 * PermissionGate (PERM-1 to PERM-4)
 * Dedicated uncluttered screen shown only when media access is missing.
 */
export function PermissionGate({ canAskAgain, onRequestAccess }: PermissionGateProps) {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <AppIcon icon={Shield01Icon} size={40} color={DarkTheme.colors.accent} />
        </View>

        <Text style={styles.title}>Allow access to your photos</Text>

        <Text style={styles.explanation}>
          Glimpse displays and manages the photos and videos stored directly on your phone.
          It runs completely offline and never uploads your media.
        </Text>

        {canAskAgain ? (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
            onPress={onRequestAccess}
          >
            <Text style={styles.primaryButtonText}>Allow access</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
            onPress={handleOpenSettings}
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.round,
    backgroundColor: Palette.accentBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  title: {
    ...Typography.largeTitle,
    color: DarkTheme.colors.text,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  explanation: {
    ...Typography.body,
    color: DarkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  primaryButton: {
    backgroundColor: DarkTheme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.sm,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

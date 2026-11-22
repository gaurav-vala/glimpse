import React from 'react';
import { StyleSheet, View, Text, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppIcon,
  Image01Icon,
  Shield01Icon,
  SparklesIcon,
  Folder01Icon,
} from './ui/Icon';
import { Button } from './ui/button';
import { Fonts, Palette, Radius, Spacing } from '../theme/theme';

interface PermissionGateProps {
  canAskAgain: boolean;
  onRequestAccess: () => void;
}

/**
 * PermissionGate
 * Clean, modern permissions onboarding screen designed with Glimpse's
 * OLED dark glass aesthetic, frosted feature highlights, and pill buttons.
 */
export function PermissionGate({ canAskAgain, onRequestAccess }: PermissionGateProps) {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(320).springify()}
        style={styles.content}
      >
        {/* Hero Glowing Squircle Icon */}
        <View style={styles.heroIconWrapper}>
          <View style={styles.heroIconGlow} />
          <View style={styles.heroSquircle}>
            <AppIcon icon={Image01Icon} size={36} color="#FFFFFF" strokeWidth={2.2} />
            <View style={styles.shieldBadge}>
              <AppIcon icon={Shield01Icon} size={14} color="#10B981" strokeWidth={2.6} />
            </View>
          </View>
        </View>

        {/* Heading & Subtitle */}
        <Text style={styles.title}>Allow access to your photos</Text>
        <Text style={styles.subtitle}>
          Glimpse needs access to show your camera roll and albums.
          Everything runs locally on your phone.
        </Text>

        {/* Feature Highlights Inset Card */}
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <AppIcon icon={Shield01Icon} size={18} color="#10B981" strokeWidth={2.2} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>100% Offline & Private</Text>
              <Text style={styles.featureDesc}>No accounts, no cloud sync, zero data leaves your phone.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <AppIcon icon={SparklesIcon} size={18} color="#60A5FA" strokeWidth={2.2} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Fluid 120 FPS Feed</Text>
              <Text style={styles.featureDesc}>Direct native MediaStore access with instant cached thumbnails.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <AppIcon icon={Folder01Icon} size={18} color="#A78BFA" strokeWidth={2.2} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Full Local Control</Text>
              <Text style={styles.featureDesc}>Browse albums, view videos, and safely manage your storage.</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionWrapper}>
          {canAskAgain ? (
            <Button
              label="Allow Access"
              variant="primary"
              size="lg"
              shape="pill"
              fullWidth
              haptic
              onPress={onRequestAccess}
            />
          ) : (
            <Button
              label="Open Phone Settings"
              variant="primary"
              size="lg"
              shape="pill"
              fullWidth
              haptic
              onPress={handleOpenSettings}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  heroIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  heroIconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  heroSquircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#17171A',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  shieldBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: '#17171A',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 23,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: 'rgba(23, 23, 26, 0.85)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 16,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: Spacing.xs,
  },
  actionWrapper: {
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
});

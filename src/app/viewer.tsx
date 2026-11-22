import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppIcon, ArrowLeft02Icon } from '../components/ui/Icon';
import { DarkTheme, Palette, Spacing, Fonts } from '../theme/theme';

export default function ViewerPlaceholder() {
  const router = useRouter();
  const { source, assetId } = useLocalSearchParams<{ source: string; assetId?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <AppIcon icon={ArrowLeft02Icon} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Full Screen Viewer</Text>
      </View>

      <View style={styles.center}>
        <Text style={styles.subtitle}>Asset: {assetId || 'Collection'}</Text>
        <Text style={styles.meta}>Source: {source}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: DarkTheme.colors.text,
  },
  meta: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: DarkTheme.colors.textSecondary,
  },
});

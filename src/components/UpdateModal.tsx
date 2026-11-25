import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Linking,
} from 'react-native';
import { Popup } from './ui/popup';
import { Button } from './ui/button';
import { Download01Icon, SparklesIcon } from './ui/Icon';
import { useUpdateStore } from '../features/updates/useUpdateStore';
import { DarkTheme, Fonts, Radius, Spacing } from '../theme/theme';

function formatReleaseNotes(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .trim();
}

export function UpdateModal() {
  const isModalVisible = useUpdateStore((s) => s.isModalVisible);
  const closeModal = useUpdateStore((s) => s.closeModal);
  const latestRelease = useUpdateStore((s) => s.latestRelease);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const downloadProgress = useUpdateStore((s) => s.downloadProgress);
  const startDownloadAndInstall = useUpdateStore(
    (s) => s.startDownloadAndInstall
  );
  const error = useUpdateStore((s) => s.error);

  if (!latestRelease) return null;

  const progressPercent = Math.round(downloadProgress * 100);

  const handleOpenGitHub = () => {
    if (latestRelease.htmlUrl) {
      Linking.openURL(latestRelease.htmlUrl).catch(() => {});
    }
  };

  return (
    <Popup
      visible={isModalVisible}
      onClose={isDownloading ? () => {} : closeModal}
      title="Update Available"
      subtitle={`Glimpse ${latestRelease.tagName}`}
      maxHeightPercent={0.75}
    >
      <View style={styles.container}>
        {/* Version Badge Card */}
        <View style={styles.versionCard}>
          <View style={styles.versionRow}>
            <View style={styles.versionCol}>
              <Text style={styles.versionLabel}>Installed</Text>
              <Text style={styles.versionValue}>v{currentVersion}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.versionCol}>
              <Text style={styles.versionLabel}>Latest</Text>
              <Text style={[styles.versionValue, styles.latestHighlight]}>
                {latestRelease.tagName}
              </Text>
            </View>
          </View>
          {latestRelease.apkSizeMb && (
            <Text style={styles.sizeText}>
              Download size: ~{latestRelease.apkSizeMb} MB
            </Text>
          )}
        </View>

        {/* Release Notes */}
        <Text style={styles.sectionTitle}>{"What's New"}</Text>
        <ScrollView
          style={styles.notesContainer}
          contentContainerStyle={styles.notesContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.notesText}>{formatReleaseNotes(latestRelease.body)}</Text>
        </ScrollView>

        {/* Progress Bar (when downloading) */}
        {isDownloading && (
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>Downloading update...</Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          {latestRelease.apkUrl ? (
            <Button
              label={
                isDownloading
                  ? `Downloading (${progressPercent}%)`
                  : 'Download & Install'
              }
              icon={isDownloading ? undefined : Download01Icon}
              size="lg"
              shape="pill"
              variant="primary"
              disabled={isDownloading}
              onPress={startDownloadAndInstall}
            />
          ) : (
            <Button
              label="View on GitHub"
              icon={SparklesIcon}
              size="lg"
              shape="pill"
              variant="primary"
              onPress={handleOpenGitHub}
            />
          )}

          <View style={styles.secondaryActions}>
            <Button
              label="Later"
              size="md"
              shape="pill"
              variant="frosted"
              disabled={isDownloading}
              onPress={closeModal}
            />
            <Button
              label="Release Notes"
              size="md"
              shape="pill"
              variant="ghost"
              onPress={handleOpenGitHub}
            />
          </View>
        </View>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  versionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  versionCol: {
    alignItems: 'center',
  },
  versionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: DarkTheme.colors.textMuted,
    marginBottom: 2,
  },
  versionValue: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: DarkTheme.colors.text,
  },
  latestHighlight: {
    color: DarkTheme.colors.accent,
  },
  arrow: {
    fontSize: 18,
    color: DarkTheme.colors.textMuted,
  },
  sizeText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: DarkTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: DarkTheme.colors.textMuted,
    marginBottom: Spacing.xs,
  },
  notesContainer: {
    maxHeight: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  notesContent: {
    paddingVertical: 2,
  },
  notesText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: DarkTheme.colors.text,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: DarkTheme.colors.text,
  },
  progressPercent: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: DarkTheme.colors.accent,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DarkTheme.colors.accent,
    borderRadius: 3,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: DarkTheme.colors.destructive,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});

import { Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { GitHubReleaseResponse, ReleaseInfo, UpdateCheckResult } from './types';

export const GITHUB_OWNER = 'gaurav-vala';
export const GITHUB_REPO = 'glimpse';

export const CURRENT_APP_VERSION =
  Constants.expoConfig?.version ?? '1.0.0';

/**
 * Parses and splits a version string like 'v1.0.2' into [1, 0, 2].
 */
function parseVersion(v: string): number[] {
  const cleaned = v.replace(/^v/i, '').trim().split('-')[0];
  return cleaned.split('.').map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
}

/**
 * Returns true if remoteVersion is strictly greater than localVersion.
 */
export function isNewerVersion(remoteTag: string, localVersion: string): boolean {
  const remote = parseVersion(remoteTag);
  const local = parseVersion(localVersion);

  const len = Math.max(remote.length, local.length);
  for (let i = 0; i < len; i++) {
    const r = remote[i] ?? 0;
    const l = local[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

class UpdateService {
  /**
   * Checks the GitHub Releases API for the latest published release.
   */
  async checkLatestRelease(): Promise<UpdateCheckResult> {
    const currentVersion = CURRENT_APP_VERSION;
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Glimpse-App-Updater',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No release has been published to GitHub yet
          return {
            hasUpdate: false,
            currentVersion,
            latestVersion: currentVersion,
            release: null,
          };
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: GitHubReleaseResponse = await response.json();
      const tagName = data.tag_name ?? '';
      const isNewer = isNewerVersion(tagName, currentVersion);

      // Find the first APK asset attached to the release
      const apkAsset = data.assets?.find((asset) =>
        asset.name.toLowerCase().endsWith('.apk')
      );

      const apkSizeMb = apkAsset
        ? (apkAsset.size / (1024 * 1024)).toFixed(1)
        : null;

      const release: ReleaseInfo = {
        tagName,
        name: data.name || tagName,
        body: data.body || 'Performance improvements and bug fixes.',
        publishedAt: data.published_at,
        htmlUrl: data.html_url,
        apkUrl: apkAsset?.browser_download_url ?? null,
        apkSizeMb,
        isNewer,
      };

      return {
        hasUpdate: isNewer,
        currentVersion,
        latestVersion: tagName.replace(/^v/i, ''),
        release,
      };
    } catch (error) {
      console.warn('[UpdateService] Failed to check for updates:', error);
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        release: null,
      };
    }
  }

  /**
   * Downloads the APK file with progress tracking and triggers Android's package installer.
   */
  async downloadAndInstallApk(
    apkUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      // Non-Android platforms open the release page in browser
      await Linking.openURL(apkUrl);
      return;
    }

    const targetUri = `${FileSystem.cacheDirectory}glimpse-update.apk`;

    // Ensure clean state before starting download
    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }
    } catch {
      // Ignore cleanup error
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      apkUrl,
      targetUri,
      {},
      (downloadProgress) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0) {
          const ratio =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          onProgress?.(Math.min(Math.max(ratio, 0), 1));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Download failed: No file URI returned.');
    }

    // Convert file:// to content:// URI (mandatory for Android 7.0+ Intent handling)
    const contentUri = await FileSystem.getContentUriAsync(result.uri);

    // Launch Android Package Installer
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
  }
}

export const updateService = new UpdateService();

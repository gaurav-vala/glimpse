import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';
import { ReleaseInfo } from './types';
import { updateService, CURRENT_APP_VERSION } from './updateService';

const DISMISSED_VERSION_FILE = `${FileSystem.documentDirectory ?? ''}glimpse-dismissed-update.txt`;

interface UpdateState {
  hasUpdate: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0 to 1
  latestRelease: ReleaseInfo | null;
  currentVersion: string;
  isModalVisible: boolean;
  error: string | null;

  checkForUpdates: (manual?: boolean) => Promise<boolean>;
  startDownloadAndInstall: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  hasUpdate: false,
  isChecking: false,
  isDownloading: false,
  downloadProgress: 0,
  latestRelease: null,
  currentVersion: CURRENT_APP_VERSION,
  isModalVisible: false,
  error: null,

  checkForUpdates: async (manual = false) => {
    set({ isChecking: true, error: null });
    try {
      const result = await updateService.checkLatestRelease();
      const hasUpdate = result.hasUpdate && Boolean(result.release?.apkUrl);

      let shouldAutoOpen = hasUpdate;
      if (hasUpdate && !manual && FileSystem.documentDirectory && result.release?.tagName) {
        try {
          const info = await FileSystem.getInfoAsync(DISMISSED_VERSION_FILE);
          if (info.exists) {
            const dismissedTag = (await FileSystem.readAsStringAsync(DISMISSED_VERSION_FILE)).trim();
            if (dismissedTag === result.release.tagName) {
              shouldAutoOpen = false;
            }
          }
        } catch {
          // Ignore file read errors
        }
      }

      set({
        hasUpdate,
        latestRelease: result.release,
        isChecking: false,
        isModalVisible: manual ? hasUpdate : shouldAutoOpen,
      });

      return hasUpdate;
    } catch (err: any) {
      set({
        isChecking: false,
        error: err?.message || 'Failed to check for updates',
      });
      return false;
    }
  },

  startDownloadAndInstall: async () => {
    const { latestRelease, isDownloading } = get();
    if (isDownloading || !latestRelease?.apkUrl) return;

    set({ isDownloading: true, downloadProgress: 0, error: null });

    try {
      await updateService.downloadAndInstallApk(
        latestRelease.apkUrl,
        (progress) => {
          set({ downloadProgress: progress });
        }
      );
      set({ isDownloading: false });
    } catch (err: any) {
      set({
        isDownloading: false,
        error: err?.message || 'Download and installation failed',
      });
    }
  },

  openModal: () => set({ isModalVisible: true }),
  closeModal: () => {
    const tag = get().latestRelease?.tagName;
    if (tag && FileSystem.documentDirectory) {
      FileSystem.writeAsStringAsync(DISMISSED_VERSION_FILE, tag).catch(() => {});
    }
    set({ isModalVisible: false });
  },
}));

import { create } from 'zustand';
import { ReleaseInfo } from './types';
import { updateService, CURRENT_APP_VERSION } from './updateService';

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

      set({
        hasUpdate,
        latestRelease: result.release,
        isChecking: false,
        isModalVisible: hasUpdate, // Automatically show modal if update found
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
  closeModal: () => set({ isModalVisible: false }),
}));

import { rpc, electron } from "@/src/utils/electron/rpc";

export const systemRpc = {
  getOpenOnStartup: async (): Promise<{
    openAtLogin: boolean;
    openMinimized: boolean;
  }> => {
    if (!rpc) return { openAtLogin: false, openMinimized: false };
    try {
      const response = await rpc.request("system:get-open-on-startup");
      if (response && response.success) {
        return {
          openAtLogin: !!response.openAtLogin,
          openMinimized: !!response.openMinimized,
        };
      }
      return { openAtLogin: false, openMinimized: false };
    } catch (error) {
      console.error("RPC Error getOpenOnStartup:", error);
      return { openAtLogin: false, openMinimized: false };
    }
  },

  setOpenOnStartup: async (
    openAtLogin: boolean,
    openMinimized?: boolean,
  ): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const response = await rpc.request("system:set-open-on-startup", {
        openAtLogin,
        openMinimized,
      });
      return response && response.success;
    } catch (error) {
      console.error("RPC Error setOpenOnStartup:", error);
      return false;
    }
  },

  getInstallSource: async (): Promise<any> => {
    if (!rpc) return null;
    try {
      return await rpc.request("system:get-install-source");
    } catch (error) {
      console.error("RPC Error getInstallSource:", error);
      return null;
    }
  },
};

export const updaterRpc = {
  check: async (): Promise<{
    success: boolean;
    version?: string;
    error?: string;
  }> => {
    if (!electron?.updater) return { success: false, error: "Not on desktop" };
    try {
      return await electron.updater.check();
    } catch (error: any) {
      console.error("RPC Error updater:check:", error);
      return { success: false, error: error.message };
    }
  },
  download: async (): Promise<{ success: boolean; error?: string }> => {
    if (!electron?.updater) return { success: false, error: "Not on desktop" };
    try {
      return await electron.updater.download();
    } catch (error: any) {
      console.error("RPC Error updater:download:", error);
      return { success: false, error: error.message };
    }
  },
  install: async (): Promise<void> => {
    if (!electron?.updater) return;
    try {
      await electron.updater.install();
    } catch (error) {
      console.error("RPC Error updater:install:", error);
    }
  },
  onStatus: (callback: (status: any) => void): (() => void) => {
    if (!electron?.updater?.onStatus) return () => {};
    return electron.updater.onStatus(callback);
  },
};

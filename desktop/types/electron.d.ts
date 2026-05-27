export interface ElectronRPC {
  request: (method: string, ...args: any[]) => Promise<any>;
}

export interface ElectronWindow {
  platform: "windows" | "macos" | "linux" | "unknown";
  rpc: ElectronRPC;
  getLocalServerUrl: () => string;
  sendCaptchaSuccess: (token: string) => void;
  onNotificationClick: (callback: (data: any) => void) => () => void;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onStateChanged: (
      callback: (state: { isMaximized: boolean }) => void,
    ) => () => void;
  };
  system: {
    getInstallSource: () => Promise<any>;
  };
  updater: {
    check: () => Promise<any>;
    download: () => Promise<any>;
    install: () => Promise<void>;
    onStatus: (callback: (status: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron?: ElectronWindow;
  }
}

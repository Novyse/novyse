import { contextBridge, ipcRenderer, webFrame } from "electron";
import { ElectronWindow } from "../types/electron";

// Fix for Expo Router: rewrite /index.html to / so the root route matches
webFrame.executeJavaScript(`
  if (window.location.pathname.endsWith("/index.html")) {
    const newUrl = window.location.href.replace("/index.html", "/");
    window.history.replaceState(null, "", newUrl);
  }
`);

const electronAPI: ElectronWindow = {
  platform:
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "macos"
        : process.platform === "linux"
          ? "linux"
          : "unknown",
  rpc: {
    request: (method: string, ...args: any[]) =>
      ipcRenderer.invoke(method, ...args),
  },
  getLocalServerUrl: (): string => ipcRenderer.sendSync("get-local-server-url"),
  sendCaptchaSuccess: (token: string) =>
    ipcRenderer.send("captcha-success", token),
  onNotificationClick: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on("notification-click", listener);
    return () => ipcRenderer.removeListener("notification-click", listener);
  },
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
    close: () => ipcRenderer.send("window:close"),
    isMaximized: (): Promise<boolean> =>
      ipcRenderer.invoke("window:is-maximized"),
    onStateChanged: (callback: (state: { isMaximized: boolean }) => void) => {
      const listener = (_event: any, state: { isMaximized: boolean }) =>
        callback(state);
      ipcRenderer.on("window:state-changed", listener);
      return () => ipcRenderer.removeListener("window:state-changed", listener);
    },
  },
  system: {
    getInstallSource: () => ipcRenderer.invoke("system:get-install-source"),
  },
  updater: {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onStatus: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on("updater:status", listener);
      return () => ipcRenderer.removeListener("updater:status", listener);
    },
  },
  shortcuts: {
    register: (keys: string[], global: boolean) =>
      ipcRenderer.send("shortcuts:register", keys, global),
    unregister: (keys: string[], global: boolean) =>
      ipcRenderer.send("shortcuts:unregister", keys, global),
    unregisterAll: () => ipcRenderer.send("shortcuts:unregisterAll"),
    onTriggered: (callback: (keys: string[]) => void) => {
      const listener = (_event: any, keys: string[]) => callback(keys);
      ipcRenderer.on("shortcuts:triggered", listener);
      return () => ipcRenderer.removeListener("shortcuts:triggered", listener);
    },
  },
};

contextBridge.exposeInMainWorld("electron", electronAPI);

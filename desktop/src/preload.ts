import { contextBridge, ipcRenderer, webFrame } from "electron";

// Fix for Expo Router: rewrite /index.html to / so the root route matches
webFrame.executeJavaScript(`
  if (window.location.pathname.endsWith("/index.html")) {
    const newUrl = window.location.href.replace("/index.html", "/");
    window.history.replaceState(null, "", newUrl);
  }
`);
contextBridge.exposeInMainWorld("electron", {
  rpc: {
    request: (method: string, ...args: any[]) =>
      ipcRenderer.invoke(method, ...args),
  },
  getLocalServerUrl: (): string => ipcRenderer.sendSync("get-local-server-url"),
  sendCaptchaSuccess: (token: string) =>
    ipcRenderer.send("captcha-success", token),
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
});

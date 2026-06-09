import { autoUpdater, UpdateInfo } from "electron-updater";
import { BrowserWindow, ipcMain, app } from "electron";
import { detectInstallSource, supportsAutoUpdate } from "./installSource";

let mainWindowRef: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let startupCompleteCallback: (() => void) | null = null;

function sendStatus(status: string, data?: Record<string, unknown>) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send("updater:status", { status, ...data });
  }
}

function createSplashWindow() {
  const path = require("path");
  const appDir = app.getAppPath();
  const iconPath = app.isPackaged
    ? path.resolve(appDir, "assets", "images", "logo-novyse.png")
    : path.resolve(appDir, "..", "assets", "images", "logo-novyse.png");

  splashWindow = new BrowserWindow({
    width: 320,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  splashWindow.center();

  const logoPath = app.isPackaged
    ? path.resolve(appDir, "assets", "images", "logo-novyse.png")
    : path.resolve(appDir, "..", "assets", "images", "logo-novyse.png");

  const logoFileUrl = "file://" + logoPath.replace(/\\/g, "/");
  const logoTag = '<img class="logo" src="' + logoFileUrl + '" alt="Novyse" />';

  const htmlContent = `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Novyse Update</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(160deg, #013480 0%, #177FC0 100%);
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 12px;
      user-select: none;
      -webkit-app-region: drag;
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 32px;
      width: 100%;
    }
    .logo {
      width: 120px;
      height: 120px;
      margin-bottom: 24px;
      border-radius: 0px;
    }
    .app-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .status {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.75);
      margin-bottom: 24px;
      min-height: 18px;
      text-align: center;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.15);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-fill {
      width: 0%;
      height: 100%;
      background: #55a8e1;
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .progress-fill.indeterminate {
      width: 30%;
      animation: slide 1.4s ease-in-out infinite;
    }
    .percent {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.45);
      min-height: 14px;
    }
    @keyframes slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
  </style>
</head>
<body>
  <div class="content">
    ${logoTag}
    <div class="app-name">Novyse</div>
    <div id="status" class="status">Checking for updates\u2026</div>
    <div class="progress-track">
      <div id="progress" class="progress-fill indeterminate"></div>
    </div>
    <div id="percent" class="percent"></div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    const bar = document.getElementById('progress');
    const pct = document.getElementById('percent');
    const st  = document.getElementById('status');
    ipcRenderer.on('update-status', (_, { text, percent }) => {
      st.innerText = text;
      if (percent !== undefined && percent > 0) {
        bar.classList.remove('indeterminate');
        bar.style.width = percent + '%';
        pct.innerText = Math.round(percent) + '%';
      }
    });
  </script>
</body>
</html>`;

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
  );

  splashWindow.once("ready-to-show", () => {
    if (splashWindow) splashWindow.show();
  });
}

function updateSplash(text: string, percent?: number) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update-status", { text, percent });
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

export function setupUpdaterListeners() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    if (startupCompleteCallback) {
      updateSplash("Checking for updates...", 0);
    }
    sendStatus("checking");
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    if (startupCompleteCallback) {
      updateSplash(`New update found (${info.version})! Downloading...`, 0);
    }
    sendStatus("available", {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    sendStatus("not-available", { version: info.version });

    if (startupCompleteCallback) {
      updateSplash("Up to date!", 100);
      const callback = startupCompleteCallback;
      startupCompleteCallback = null;
      setTimeout(() => {
        closeSplash();
        callback();
      }, 800);
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    if (startupCompleteCallback) {
      updateSplash("Downloading update...", progress.percent);
    }
    sendStatus("downloading", {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    sendStatus("downloaded", { version: info.version });

    if (startupCompleteCallback) {
      updateSplash("Update ready! Installing...", 100);
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 1200);
    }
  });

  autoUpdater.on("error", (err) => {
    sendStatus("error", { message: err.message });

    if (startupCompleteCallback) {
      console.error("[updater] Startup update error:", err);
      updateSplash("Update failed. Starting app...", 0);
      const callback = startupCompleteCallback;
      startupCompleteCallback = null;
      setTimeout(() => {
        closeSplash();
        callback();
      }, 1500);
    }
  });

  ipcMain.handle("updater:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("updater:download", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

export function checkUpdatesAtStartup(onComplete: () => void) {
  const source = detectInstallSource();
  if (!app.isPackaged || !supportsAutoUpdate(source)) {
    onComplete();
    return;
  }

  startupCompleteCallback = onComplete;
  createSplashWindow();

  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[updater] Failed to check updates at startup:", err);
    if (startupCompleteCallback) {
      startupCompleteCallback = null;
      closeSplash();
      onComplete();
    }
  });
}

export function initUpdater(win: BrowserWindow) {
  mainWindowRef = win;
}

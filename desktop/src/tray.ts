import { app, Tray, Menu, BrowserWindow } from "electron";
import * as path from "path";

let trayInstance: Tray | null = null;
let isQuitting = false;

export function checkSingleInstance(): boolean {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return true;
}

export function setupTray(mainWindow: BrowserWindow) {
  const appDir = app.getAppPath();
  const iconPath = app.isPackaged
    ? path.resolve(appDir, "assets", "images", "logo-novyse.png")
    : path.resolve(appDir, "..", "assets", "images", "logo-novyse.png");

  trayInstance = new Tray(iconPath);
  trayInstance.setToolTip(app.name);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Novyse",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit Novyse",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  trayInstance.setContextMenu(contextMenu);
  trayInstance.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });
}

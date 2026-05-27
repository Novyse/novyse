const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

import { checkSingleInstance, setupTray } from "./tray";
import { registerShortcuts } from "./shortcuts";

if (!checkSingleInstance()) {
  process.exit(0);
}

import { initDb } from "./db";
import { registerRpcHandlers } from "./rpc";
import { startLocalServer, getLocalServerUrl } from "./server/index";

import config from "../electron-builder.config";

app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");

const appName = config.productName;
app.name = appName;
process.title = appName;

let mainWindow: any;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "novyse",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

function createWindow() {
  const appDir = app.getAppPath();
  const preloadPath = path.resolve(appDir, "build", "preload.js");
  const iconPath = app.isPackaged
    ? path.resolve(appDir, "assets", "images", "logo-novyse.png")
    : path.resolve(appDir, "..", "assets", "images", "logo-novyse.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 350,
    minHeight: 500,
    title: appName,
    icon: iconPath,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  mainWindow.removeMenu();
  //mainWindow.setWindowButtonVisibility(false);
  setupTray(mainWindow);
  registerShortcuts(mainWindow);

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window:state-changed", { isMaximized: true });
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window:state-changed", { isMaximized: false });
  });

  mainWindow.loadURL("novyse://mainview/index.html");
}

app.whenReady().then(async () => {
  await initDb();
  registerRpcHandlers();
  startLocalServer();

  ipcMain.on("get-local-server-url", (event: { returnValue: string }) => {
    event.returnValue = getLocalServerUrl();
  });

  ipcMain.on("window:minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window:toggle-maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle("window:is-maximized", () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  protocol.registerFileProtocol(
    "novyse",
    (request: { url: string }, callback: (x: { path: string }) => void) => {
      const url = new URL(request.url);
      let pathname = url.pathname;
      if (pathname.startsWith("/")) {
        pathname = pathname.substring(1);
      }

      const appDir = app.getAppPath();
      const distPath = app.isPackaged
        ? path.resolve(appDir, "dist")
        : path.resolve(appDir, "..", "dist");

      let filePath = path.join(distPath, pathname);

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        filePath = path.join(distPath, "index.html");
      }

      callback({ path: filePath });
    },
  );

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

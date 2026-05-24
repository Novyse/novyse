const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

import { initDb } from "./db";
import { registerRpcHandlers } from "./rpc";
import { startLocalServer, getLocalServerUrl } from "./server/index";

import config from "../electron-builder.config";

let mainWindow;

protocol.registerSchemesAsPrivileged([
  {
    scheme: "novyse",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow() {
  const appDir = app.getAppPath();
  const preloadPath = path.resolve(appDir, "build", "preload.js");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    title: config ? config.productName : "Novyse",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  mainWindow.loadURL("novyse://mainview/index.html");

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
}

app.whenReady().then(async () => {
  await initDb();
  registerRpcHandlers();
  startLocalServer();

  ipcMain.on("get-local-server-url", (event: { returnValue: string }) => {
    event.returnValue = getLocalServerUrl();
  });

  protocol.handle("novyse", (request: { url: string }) => {
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

    return require("electron").net.fetch("file://" + filePath);
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

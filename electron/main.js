const { app, BrowserWindow, Tray, Menu, shell, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let tray;
let isQuitting = false;

// Register custom protocol allowing for local asset loading
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

// --- ELECTRON WINDOW ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 340,
    minHeight: 568,
    title: "Novyse",
    icon: path.join(__dirname, "assets/images", "favicon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: false,
    },
    preload: path.join(__dirname, "renderer.js"),
    show: false,
  });

  protocol.registerFileProtocol("novyse", (request, callback) => {
    let url = request.url.substr(9); // removes "novyse://"
    if (url.startsWith("novyse/")) {
      url = url.substr(7); // removes "novyse/"
    }
    if (url === "/" || url === "") {
      url = "index.html";
    }
    const filePath = path.join(__dirname, "webapp", url);
    callback({ path: filePath });
  });

  // Use created protocol
  mainWindow.loadURL("novyse://novyse/");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      if (tray) event.preventDefault(), mainWindow.hide();
      else event.preventDefault(), mainWindow.minimize();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Intercept new window events to open links in default browser

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Permetti solo verso il protocollo novyse
    if (parsedUrl.protocol !== "novyse:") {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// --- TRAY ---
function createTray() {
  const trayIconPath = path.join(__dirname, "assets/images", "favicon.png");
  if (!fs.existsSync(trayIconPath)) return;

  tray = new Tray(trayIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => mainWindow.show() },
    { label: "Hide App", click: () => mainWindow.hide() },
    { type: "separator" },
    {
      label: "About",
      click: () => shell.openExternal("https://www.novyse.com"),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip("Novyse");

  tray.on("double-click", () =>
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  );
  if (process.platform === "win32") {
    tray.on("click", () =>
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    );
  }
}

// --- APP EVENT HANDLERS ---
app.whenReady().then(() => {
  createWindow();
  try {
    createTray();
  } catch (err) {
    console.log(err.message);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") isQuitting = true;
});
app.on("before-quit", () => {
  isQuitting = true;
});

// Deep linking protocol
app.setAsDefaultProtocolClient("novyse");

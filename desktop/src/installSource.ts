import { app, ipcMain } from "electron";

export type DesktopInstallSource =
  // Windows
  | "windows-nsis"
  | "windows-portable"
  | "windows-store"
  // Linux
  | "linux-appimage"
  | "linux-deb-rpm"
  | "linux-snap"
  | "linux-flatpak"
  // macOS
  | "macos-dmg"
  | "macos-store"
  // Fallback
  | "unknown";

let cachedSource: DesktopInstallSource | null = null;

export function detectInstallSource(): DesktopInstallSource {
  if (cachedSource) return cachedSource;

  const platform = process.platform;

  if (platform === "win32") {
    // Microsoft Store
    if ((process as any).windowsStore === true) {
      cachedSource = "windows-store";
    }
    // Portable executable
    else if (process.env.PORTABLE_EXECUTABLE_FILE) {
      cachedSource = "windows-portable";
    }
    // NSIS installer
    else if (app.isPackaged) {
      cachedSource = "windows-nsis";
    } else {
      cachedSource = "unknown";
    }
  } else if (platform === "linux") {
    // Snap
    if (process.env.SNAP) {
      cachedSource = "linux-snap";
    }
    // Flatpak
    else if (process.env.FLATPAK_ID) {
      cachedSource = "linux-flatpak";
    }
    // AppImage
    else if (process.env.APPIMAGE) {
      cachedSource = "linux-appimage";
    }
    // .deb / .rpm
    else if (app.isPackaged) {
      cachedSource = "linux-deb-rpm";
    } else {
      cachedSource = "unknown";
    }
  } else if (platform === "darwin") {
    // Mac App Store
    if ((process as any).mas === true) {
      cachedSource = "macos-store";
    }
    // .dmg / .zip
    else if (app.isPackaged) {
      cachedSource = "macos-dmg";
    } else {
      cachedSource = "unknown";
    }
  } else {
    cachedSource = "unknown";
  }

  return cachedSource;
}

export function supportsAutoUpdate(source: DesktopInstallSource): boolean {
  return [
    "windows-nsis",
    "linux-appimage",
    "linux-deb-rpm",
    "macos-dmg",
  ].includes(source);
}

export function getDesktopOSName(): "windows" | "macos" | "linux" | "unknown" {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

export function registerInstallSourceHandlers() {
  ipcMain.handle("system:get-install-source", () => {
    return {
      success: true,
      installSource: detectInstallSource(),
      desktopOS: getDesktopOSName(),
      supportsAutoUpdate: supportsAutoUpdate(detectInstallSource()),
    };
  });
}

import { Platform } from "react-native";
import * as Application from "expo-application";
import { electron } from "../electron/rpc";
import { systemRpc } from "../electron/system";

export const getOs = (): DesktopOS | "web" | typeof Platform.OS => {
  if (electron) {
    return getDesktopOS();
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  return Platform.OS; // "android" o "ios"
};

export const getPlatform = (): "desktop" | "web" | "mobile" => {
  if (electron) {
    return "desktop";
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  return "mobile"; // iOS o Android
};

export type DesktopOS = "windows" | "macos" | "linux" | "unknown";

export const getDesktopOS = (): DesktopOS => {
  if (electron?.platform) {
    return electron.platform as DesktopOS;
  }

  return "unknown";
};

export type InstallSource =
  // Mobile
  | "play-store"
  | "app-store"
  | "android-apk"
  // Desktop - Windows
  | "windows-nsis"
  | "windows-portable"
  | "windows-store"
  // Desktop - Linux
  | "linux-appimage"
  | "linux-deb-rpm"
  | "linux-snap"
  | "linux-flatpak"
  // Desktop - macOS
  | "macos-dmg"
  | "macos-store"
  // Fallback
  | "web"
  | "unknown";

const AUTO_UPDATE_SOURCES: InstallSource[] = [
  "windows-nsis",
  "linux-appimage",
  "linux-deb-rpm",
  "macos-dmg",
  "android-apk",
];

let cachedInstallSource: InstallSource | null = null;
export const getInstallSource = async (): Promise<InstallSource> => {
  if (cachedInstallSource) return cachedInstallSource;

  const os = getOs();

  switch (os) {
    case "web":
      cachedInstallSource = "web";
      return "web";

    case "ios":
      cachedInstallSource = "app-store";
      return "app-store";

    case "android": {
      try {
        const referrer = await Application.getInstallReferrerAsync();
        if (
          referrer &&
          (referrer.includes("utm_source=google-play") ||
            referrer.includes("google-play") ||
            referrer.includes("android.vending"))
        ) {
          cachedInstallSource = "play-store";
        } else {
          cachedInstallSource = "android-apk";
        }
      } catch (err) {
        cachedInstallSource = "android-apk";
      }
      return cachedInstallSource;
    }

    case "windows":
    case "macos":
    case "linux":
      try {
        const result = await systemRpc.getInstallSource();
        if (result?.success && result.installSource) {
          cachedInstallSource = result.installSource as InstallSource;
          return cachedInstallSource;
        }
      } catch (err) {
        console.error("[device/type] Failed to get install source:", err);
      }
      break;
  }

  cachedInstallSource = "unknown";
  return "unknown";
};

export const supportsAutoUpdate = (source: InstallSource): boolean => {
  return AUTO_UPDATE_SOURCES.includes(source);
};

const InternalPlatform: string = getPlatform();
export default InternalPlatform;

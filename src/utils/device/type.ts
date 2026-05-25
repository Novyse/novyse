import { Platform } from "react-native";

// Detect Electron
const isElectron = (): boolean =>
  typeof window !== "undefined" && window.location &&
  (window.location.protocol === "novyse:" || Boolean((window as any).electron));

export const getOs = (): "desktop" | "web" | typeof Platform.OS => {
  if (isElectron()) {
    return "desktop"; // Desktop app
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  // App mobile
  return Platform.OS; // "android" o "ios"
};

export const getPlatform = (): "desktop" | "web" | "mobile" => {
  if (isElectron()) {
    return "desktop";
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  // Native mobile app
  return "mobile"; // iOS o Android
};

const InternalPlatform: string = getPlatform();
export default InternalPlatform;

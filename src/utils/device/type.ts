import { Platform } from "react-native";

// Detect Electrobun
const isElectrobun = (): boolean =>
  typeof window !== "undefined" &&
  (window.location.protocol === "views:" ||
    Boolean(
      (window as any).process &&
      (window as any).process.versions &&
      (window as any).process.versions.electrobun,
    ));

export const getOs = (): "desktop" | "web" | typeof Platform.OS => {
  if (isElectrobun()) {
    return "desktop"; // Desktop app
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  // App mobile
  return Platform.OS; // "android" o "ios"
};

export const getPlatform = (): "desktop" | "web" | "mobile" => {
  if (isElectrobun()) {
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

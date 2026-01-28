import { Platform } from "react-native";

// Detect Electron
const isElectron = () =>
  typeof window !== "undefined" &&
  window.process &&
  window.process.versions &&
  window.process.versions.electron;

export const getOs = () => {
  if (isElectron()) {
    return "electron"; // Desktop app
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  // App mobile
  return Platform.OS; // "android" o "ios"
};

export const getPlatform = () => {
  if (isElectron()) {
    return "desktop"; // Electron
  }

  if (Platform.OS === "web") {
    return "web"; // Browser
  }

  // Native mobile app
  return "mobile"; // iOS o Android
};

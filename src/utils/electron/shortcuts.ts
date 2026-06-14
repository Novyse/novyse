import { electron } from "./rpc";
import Platform from "../device/type";

export const shortcutsRpc = {
  register: (keys: string[], global: boolean) => {
    if (Platform === "desktop" && electron?.shortcuts) {
      electron.shortcuts.register(keys, global);
    }
  },
  unregister: (keys: string[], global: boolean) => {
    if (Platform === "desktop" && electron?.shortcuts) {
      electron.shortcuts.unregister(keys, global);
    }
  },
  unregisterAll: () => {
    if (Platform === "desktop" && electron?.shortcuts) {
      electron.shortcuts.unregisterAll();
    }
  },
  onTriggered: (callback: (keys: string[]) => void) => {
    if (Platform === "desktop" && electron?.shortcuts) {
      return electron.shortcuts.onTriggered(callback);
    }
    return () => {};
  },
};

import { BrowserWindow, ipcMain, globalShortcut } from "electron";
import { BRANCH } from "../../app.config";

/**
 * Registers application keyboard shortcuts for the Electron main window
 */
export function registerShortcuts(mainWindow: BrowserWindow) {
  mainWindow.webContents.on("before-input-event", (event: any, input: any) => {
    // 1. Ctrl+W / Cmd+W to close window to tray
    if (
      (input.control || input.meta) &&
      input.key.toLowerCase() === "w" &&
      input.type === "keyDown"
    ) {
      mainWindow.close(); // Triggers the close listener in tray.ts (which hides to tray)
      event.preventDefault();
      return;
    }

    // 2. DevTools toggle (Ctrl+Shift+I / Cmd+Option+I / F12) - Development only
    if (BRANCH === "development") {
      const isDevToolsShortcut =
        ((input.control || input.meta) &&
          input.shift &&
          input.key.toLowerCase() === "i") ||
        input.key === "F12";

      if (isDevToolsShortcut) {
        if (input.type === "keyDown") {
          mainWindow.webContents.toggleDevTools();
        }
        event.preventDefault();
      }
    }
  });

  const mapKeys = (keys: string[]): string => {
    return keys
      .map((k) => {
        const lower = k.toLowerCase();
        if (lower === "ctrl" || lower === "cmd") return "CommandOrControl";
        if (lower === "alt") return "Alt";
        if (lower === "shift") return "Shift";
        if (lower === "esc") return "Escape";
        if (k === "↑") return "Up";
        if (k === "↓") return "Down";
        if (k === "←") return "Left";
        if (k === "→") return "Right";
        return k.toUpperCase();
      })
      .join("+");
  };

  ipcMain.on("shortcuts:register", (event, keys: string[], global: boolean) => {
    if (global) {
      const accelerator = mapKeys(keys);
      const success = globalShortcut.register(accelerator, () => {
        mainWindow.webContents.send("shortcuts:triggered", keys);
      });
      if (!success) {
        console.error(`Failed to register global shortcut: ${accelerator}`);
      }
    }
  });

  ipcMain.on(
    "shortcuts:unregister",
    (event, keys: string[], global: boolean) => {
      if (global) {
        const accelerator = mapKeys(keys);
        globalShortcut.unregister(accelerator);
      }
    },
  );

  ipcMain.on("shortcuts:unregisterAll", () => {
    globalShortcut.unregisterAll();
  });
}

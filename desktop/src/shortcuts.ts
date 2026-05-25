import { BrowserWindow } from "electron";
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
        ((input.control || input.meta) && input.shift && input.key.toLowerCase() === "i") ||
        input.key === "F12";

      if (isDevToolsShortcut) {
        if (input.type === "keyDown") {
          mainWindow.webContents.toggleDevTools();
        }
        event.preventDefault();
      }
    }
  });
}

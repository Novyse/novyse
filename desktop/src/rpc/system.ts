import { app } from "electron";
import * as path from "path";
import * as fs from "fs";

const getAutostartFilePath = () => {
  const homeDir = app.getPath("home");
  const filename = `${app.name.toLowerCase()}.desktop`;
  return path.join(homeDir, ".config", "autostart", filename);
};

export function handleSetOpenOnStartup(request: {
  openAtLogin: boolean;
  openMinimized?: boolean;
}) {
  try {
    const openMinimized = request.openMinimized ?? true;
    if (process.platform === "linux") {
      const autostartFilePath = getAutostartFilePath();
      const autostartDir = path.dirname(autostartFilePath);

      if (request.openAtLogin) {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }

        const execPath = process.env.APPIMAGE || process.execPath;
        const execArgs = openMinimized
          ? app.isPackaged
            ? " --hidden"
            : ` "${app.getAppPath()}" --hidden`
          : app.isPackaged
          ? ""
          : ` "${app.getAppPath()}"`;

        const desktopContent = `[Desktop Entry]
          Type=Application
          Version=${app.getVersion()}
          Name=${app.name}
          Comment=Start ${app.name} on login
          Exec="${execPath}"${execArgs}
          StartupNotify=false
          Terminal=false
        `;
        fs.writeFileSync(autostartFilePath, desktopContent, "utf-8");
      } else {
        if (fs.existsSync(autostartFilePath)) {
          fs.unlinkSync(autostartFilePath);
        }
      }
      return { success: true };
    } else {
      app.setLoginItemSettings({
        openAtLogin: request.openAtLogin,
        args: openMinimized ? ["--hidden"] : [],
      });
      return { success: true };
    }
  } catch (error) {
    console.error("Failed to set login item settings:", error);
    return { success: false, error: String(error) };
  }
}

export function handleGetOpenOnStartup() {
  try {
    if (process.platform === "linux") {
      const autostartFilePath = getAutostartFilePath();
      const exists = fs.existsSync(autostartFilePath);
      let openMinimized = false;
      if (exists) {
        const content = fs.readFileSync(autostartFilePath, "utf-8");
        openMinimized = content.includes("--hidden");
      }
      return { success: true, openAtLogin: exists, openMinimized };
    } else {
      const settings = app.getLoginItemSettings({ args: ["--hidden"] });
      return {
        success: true,
        openAtLogin: settings.openAtLogin,
        openMinimized: settings.wasOpenedAsHidden || false,
      };
    }
  } catch (error) {
    console.error("Failed to get login item settings:", error);
    return { success: false, error: String(error) };
  }
}

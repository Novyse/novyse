import { app } from "electron";
import * as path from "path";
import * as fs from "fs";

const getAutostartFilePath = () => {
  const homeDir = app.getPath("home");
  const filename = `${app.name.toLowerCase()}.desktop`;
  return path.join(homeDir, ".config", "autostart", filename);
};

export function handleSetOpenOnStartup(request: { openAtLogin: boolean }) {
  try {
    if (process.platform === "linux") {
      const autostartFilePath = getAutostartFilePath();
      const autostartDir = path.dirname(autostartFilePath);

      if (request.openAtLogin) {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }

        const execPath = process.env.APPIMAGE || process.execPath;
        const execArgs = app.isPackaged
          ? " --hidden"
          : ` "${app.getAppPath()}" --hidden`;

        const desktopContent = `[Desktop Entry]
Type=Application
Version=1.0
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
        args: ["--hidden"],
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
      return { success: true, openAtLogin: fs.existsSync(autostartFilePath) };
    } else {
      const settings = app.getLoginItemSettings({ args: ["--hidden"] });
      return { success: true, openAtLogin: settings.openAtLogin };
    }
  } catch (error) {
    console.error("Failed to get login item settings:", error);
    return { success: false, error: String(error) };
  }
}

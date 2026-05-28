import { Notification, BrowserWindow, app, nativeImage } from "electron";
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";
import { FILES_DIR } from "../paths";
import type {
  ShowNotificationRequest,
  ShowNotificationResponse,
} from "../../../src/types/rpc";

export async function handleShowNotification(
  request: ShowNotificationRequest,
): Promise<ShowNotificationResponse> {
  try {
    const { title, body, subtitle, data, icon } = request;

    const appDir = app.getAppPath();
    const defaultIconPath = app.isPackaged
      ? path.resolve(appDir, "assets", "images", "logo-novyse.png")
      : path.resolve(appDir, "..", "assets", "images", "logo-novyse.png");

    let finalIcon: string | Electron.NativeImage = defaultIconPath;
    if (icon) {
      const potentialIconPath = path.join(FILES_DIR, icon);
      if (fs.existsSync(potentialIconPath)) {
        try {
          const buffer = fs.readFileSync(potentialIconPath);
          const pngBuffer = await sharp(buffer)
            .resize(256, 256, { fit: "cover" })
            .png()
            .toBuffer();

          finalIcon = nativeImage.createFromBuffer(pngBuffer);
        } catch (err) {
          console.error("Failed to process notification icon with sharp:", err);
        }
      }
    }

    let finalBody = body || "";
    if (subtitle) {
      if (process.platform === "darwin") {
        // macOS: use native subtitle field
      } else {
        // Linux/Windows: prepend subtitle to body
        finalBody = `${subtitle}\n${finalBody}`;
      }
    }

    const notification = new Notification({
      title: title,
      subtitle: process.platform === "darwin" ? subtitle : undefined,
      body: finalBody,
      icon: finalIcon,
    });

    notification.show();

    // When the notification is clicked, bring the app window to front
    notification.on("click", () => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const mainWindow = windows[0];
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();

        // Send an event back to renderer to handle the click (e.g. open the chat)
        mainWindow.webContents.send("notification-click", data);
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("electron:showNotification error:", error.message);
    return { success: false, error: error.message };
  }
}

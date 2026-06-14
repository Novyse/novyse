import { session, desktopCapturer, ipcMain, systemPreferences } from "electron";

export function setupScreenShareHandler() {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(true);
    },
  );

  session.defaultSession.setPermissionCheckHandler(() => {
    return true;
  });

  const isWayland =
    process.platform === "linux" &&
    !!(
      process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === "wayland"
    );

  const isMacOs15OrHigher =
    process.platform === "darwin" &&
    parseInt(process.getSystemVersion().split(".")[0]) >= 15;

  const shouldUseNativePicker = isWayland || isMacOs15OrHigher;

  ipcMain.handle("screenshare:get-sources", async () => {
    if (process.platform === "darwin") {
      const status = systemPreferences.getMediaAccessStatus("screen");
      if (status !== "granted") {
        return { error: "permission-denied" };
      }
    }

    if (shouldUseNativePicker) {
      return { hasNativeScreenShareMenu: true };
    }

    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 160, height: 160 },
    });

    return {
      osVersion:
        process.platform === "darwin" ? process.getSystemVersion() : undefined,
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : undefined,
        appIcon: s.appIcon ? s.appIcon.toDataURL() : undefined,
      })),
    };
  });

  let nativePickerTypes: ("screen" | "window")[] = ["screen", "window"];

  ipcMain.handle(
    "screenshare:set-native-type",
    async (_, type: "screen" | "window" | "both") => {
      if (type === "screen") nativePickerTypes = ["screen"];
      else if (type === "window") nativePickerTypes = ["window"];
      else nativePickerTypes = ["screen", "window"];
      return true;
    },
  );

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      if (shouldUseNativePicker) {
        desktopCapturer
          .getSources({ types: nativePickerTypes })
          .then((sources) => {
            if (sources && sources.length > 0) {
              callback({ video: sources[0], audio: "loopback" });
            } else {
              callback({});
            }
          })
          .catch(() => callback({}));
      } else {
        callback({});
      }
    },
    { useSystemPicker: shouldUseNativePicker },
  );
}

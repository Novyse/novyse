import { session, desktopCapturer, Menu, MenuItem, ipcMain } from "electron";

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

  ipcMain.handle("screenshare:pick-source", async () => {
    if (isWayland) {
      const { dialog } = require("electron");
      const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: ["Video Only", "Video + System Audio", "Cancel"],
        title: "Wayland Screen Share",
        message: "Do you want to share your system audio?",
        detail:
          "Warning: sharing system audio may cause echo if you are not using headphones.",
        defaultId: 0,
        cancelId: 2,
      });

      if (response === 2) return null;
      return { sourceId: "wayland", includeAudio: response === 1 };
    }

    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 160, height: 160 },
    });

    if (!sources || sources.length === 0) return null;

    return new Promise((resolve) => {
      const menu = new Menu();
      let picked = false;

      const pick = (sourceId: string | null, includeAudio: boolean) => {
        if (!picked) {
          picked = true;
          resolve(sourceId ? { sourceId, includeAudio } : null);
        }
      };

      for (const source of sources) {
        menu.append(
          new MenuItem({
            label: source.name,
            icon: source.thumbnail
              ? source.thumbnail.resize({ height: 80 })
              : undefined,
            submenu: [
              {
                label: "Share without Audio",
                click: () => pick(source.id, false),
              },
              {
                label: "Share with System Audio (Warning: may echo)",
                click: () => pick(source.id, true),
              },
            ],
          }),
        );
      }

      menu.append(new MenuItem({ type: "separator" }));
      menu.append(
        new MenuItem({
          label: "Cancel",
          click: () => pick(null, false),
        }),
      );

      menu.on("menu-will-close", () => {
        setTimeout(() => pick(null, false), 100);
      });

      menu.popup();
    });
  });

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      if (isWayland) {
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
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
    { useSystemPicker: false },
  );
}

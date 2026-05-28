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

  let pendingSource: Electron.DesktopCapturerSource | null = null;

  ipcMain.handle("screenshare:pick-source", async () => {
    if (isWayland) return true;

    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 160, height: 160 },
    });

    if (!sources || sources.length === 0) return false;

    return new Promise<boolean>((resolve) => {
      const menu = new Menu();
      let picked = false;

      const pick = (source: Electron.DesktopCapturerSource | null) => {
        if (!picked) {
          picked = true;
          pendingSource = source;
          resolve(source !== null);
        }
      };

      for (const source of sources) {
        menu.append(
          new MenuItem({
            label: source.name,
            icon: source.thumbnail
              ? source.thumbnail.resize({ height: 80 })
              : undefined,
            click: () => pick(source),
          }),
        );
      }

      menu.append(new MenuItem({ type: "separator" }));
      menu.append(
        new MenuItem({
          label: "Cancel",
          click: () => pick(null),
        }),
      );

      menu.on("menu-will-close", () => {
        setTimeout(() => pick(null), 100);
      });

      menu.popup();
    });
  });

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    if (pendingSource) {
      const source = pendingSource;
      pendingSource = null;
      callback({ video: source });
    } else {
      desktopCapturer
        .getSources({ types: ["screen", "window"] })
        .then((sources) => {
          if (sources && sources.length > 0) {
            callback({ video: sources[0] });
          } else {
            callback({});
          }
        })
        .catch(() => callback({}));
    }
  });
}

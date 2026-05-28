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

  // IPC: show native menu, return selected source ID (or null if cancelled)
  ipcMain.handle("screenshare:pick-source", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
    });

    if (!sources || sources.length === 0) return null;

    return new Promise<string | null>((resolve) => {
      const menu = new Menu();
      let picked = false;

      const pick = (id: string | null) => {
        if (!picked) {
          picked = true;
          resolve(id);
        }
      };

      for (const source of sources) {
        menu.append(
          new MenuItem({
            label: source.name,
            icon: source.thumbnail
              ? source.thumbnail.resize({ height: 80 })
              : undefined,
            click: () => pick(source.id),
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
}

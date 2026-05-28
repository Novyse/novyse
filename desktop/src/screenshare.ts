import { session, desktopCapturer, Menu, MenuItem } from "electron";

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

  if (!isWayland) {
    session.defaultSession.setDisplayMediaRequestHandler(
      (_request, callback) => {
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
          .then((sources) => {
            if (!sources || sources.length === 0) {
              callback({});
              return;
            }

            const menu = new Menu();
            let resolved = false;

            const resolve = (stream: Record<string, unknown>) => {
              if (!resolved) {
                resolved = true;
                callback(stream as any);
              }
            };

            for (const source of sources) {
              menu.append(
                new MenuItem({
                  label: source.name,
                  icon: source.thumbnail
                    ? source.thumbnail.resize({ height: 80 })
                    : undefined,
                  click: () => {
                    resolve({
                      video: { id: source.id, name: source.name },
                    });
                  },
                }),
              );
            }

            menu.append(new MenuItem({ type: "separator" }));
            menu.append(
              new MenuItem({
                label: "Cancel",
                click: () => resolve({}),
              }),
            );

            menu.on("menu-will-close", () => {
              setTimeout(() => resolve({}), 100);
            });

            menu.popup();
          })
          .catch((err) => {
            console.error("Failed to get desktop sources:", err);
            callback({});
          });
      },
    );
  }
}

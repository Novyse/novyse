const { session, desktopCapturer, Menu, MenuItem } = require("electron");

export function setupScreenShareHandler() {
  session.defaultSession.setPermissionRequestHandler(
    (webContents: any, permission: string, callback: any) => {
      callback(true);
    },
  );

  const isWayland =
    process.platform === "linux" &&
    !!(
      process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === "wayland"
    );

  if (!isWayland) {
    session.defaultSession.setDisplayMediaRequestHandler(
      (request: any, callback: any) => {
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
          .then((sources: any[]) => {
            if (!sources || sources.length === 0) {
              return callback(null);
            }

            const menu = new Menu();

            let callbackCalled = false;

            const safeCallback = (arg: any) => {
              if (!callbackCalled) {
                callbackCalled = true;
                callback(arg);
              }
            };

            sources.forEach((source: any) => {
              menu.append(
                new MenuItem({
                  label: source.name,
                  icon: source.thumbnail
                    ? source.thumbnail.resize({ height: 80 })
                    : undefined,
                  click: () => safeCallback({ video: source }),
                }),
              );
            });

            menu.append(new MenuItem({ type: "separator" }));
            menu.append(
              new MenuItem({
                label: "Cancel",
                click: () => safeCallback(null),
              }),
            );

            menu.on("menu-will-close", () => {
              setTimeout(() => safeCallback(null), 100);
            });

            menu.popup();
          })
          .catch((err: any) => {
            console.error("Error getting desktop sources:", err);
            callback(null);
          });
      },
    );
  }
}

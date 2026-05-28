const { session, desktopCapturer, Menu, MenuItem } = require("electron");

export function setupScreenShareHandler() {
  if (process.platform !== "linux") {
    session.defaultSession.setDisplayMediaRequestHandler(
      (request: any, callback: any) => {
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
          .then((sources: any[]) => {
            if (!sources || sources.length === 0) {
              return callback({} as any);
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
                click: () => safeCallback({} as any),
              }),
            );

            menu.on("menu-will-close", () => {
              setTimeout(() => safeCallback({} as any), 100);
            });

            menu.popup();
          })
          .catch((err: any) => {
            console.error("Error getting desktop sources:", err);
            callback({} as any);
          });
      },
    );
  }
}

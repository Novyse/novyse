const { session, desktopCapturer } = require("electron");

export function setupScreenShareHandler() {
  session.defaultSession.setPermissionRequestHandler(
    (webContents: any, permission: string, callback: any) => {
      if (permission === "display-capture" || permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    },
  );

  if (process.platform !== "linux") {
    session.defaultSession.setDisplayMediaRequestHandler(
      (request: any, callback: any) => {
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
          .then((sources: any[]) => {
            if (sources && sources.length > 0) {
              callback({ video: sources[0] });
            } else {
              callback({} as any);
            }
          })
          .catch((err: any) => {
            console.error("Error getting desktop sources:", err);
            callback({} as any);
          });
      },
    );
  }
}

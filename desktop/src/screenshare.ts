const { session, desktopCapturer } = require("electron");

export function setupScreenShareHandler() {

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

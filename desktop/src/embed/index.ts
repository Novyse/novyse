import { session } from "electron";

export function setupEmbedHandlers() {
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["https://player.twitch.tv/*"] },
    (
      details: { responseHeaders?: Record<string, string[]> },
      callback: (response: {
        responseHeaders?: Record<string, string[]>;
      }) => void,
    ) => {
      const headers = details.responseHeaders || {};
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-security-policy") {
          headers[key] = headers[key].map((v: string) =>
            v.replace(/frame-ancestors\s+[^;]*(;|$)/gi, "$1"),
          );
        }
      }
      callback({ responseHeaders: headers });
    },
  );
}

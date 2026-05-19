import { BrowserWindow } from "electrobun/bun";
import desktopConfig from "../../electrobun.config";
import { BRANCH } from "../../../../app.config";
import { startLocalServer } from "./server";
import { rpc } from "./rpc";

const localServer = startLocalServer();
const localServerPort = localServer.port;
console.debug(`Local server running on http://localhost:${localServerPort}`);

const preloadCode = `
  if (window.location.pathname === '/index.html' || window.location.pathname.endsWith('/index.html')) {
    window.history.replaceState(null, '', '/');
  }
`;

const mainWindow = new BrowserWindow({
  title: desktopConfig.app.name,
  url: `views://mainview/index.html`,
  preload: preloadCode,
  rpc: rpc,
  frame: {
    width: 1200,
    height: 900,
    x: 200,
    y: 200,
  },
});

const webview = mainWindow.webview;
if (BRANCH === "development") {
  webview.openDevTools();
}

webview.on("dom-ready", () => {
  webview.executeJavascript(`
    window.localServerUrl = "http://localhost:${localServerPort}";
  `);
});

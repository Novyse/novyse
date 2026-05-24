import express from "express";
import { getCaptchaHtml } from "./captcha";
import {
  handleFileDownload,
  handleFileCopy,
  handleFilePost,
  handleFileGet,
  handleFileHead,
} from "./files";

import { CLOUDFLARE_TURNSTILE_PUBLIC } from "../../../app.config";

let localServerUrl = "";
let localApp: any = null;
let listener: any = null;

export function startLocalServer(): string {
  if (localApp && localServerUrl) {
    return localServerUrl;
  }

  localApp = express();

  localApp.use((req: any, res: any, next: any) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  localApp.get("/captcha", (req: any, res: any) => {
    const siteKey = CLOUDFLARE_TURNSTILE_PUBLIC;
    res.send(getCaptchaHtml(siteKey));
  });

  localApp.post("/files/download", express.json(), handleFileDownload);
  localApp.post("/files/copy", express.json(), handleFileCopy);

  localApp.post(
    "/files/:key",
    express.raw({ type: "*/*", limit: "500mb" }),
    handleFilePost,
  );

  localApp.get("/files/:key", handleFileGet);
  localApp.head("/files/:key", handleFileHead);

  listener = localApp.listen(0, "localhost", () => {
    const port = listener.address().port;
    localServerUrl = `http://localhost:${port}`;
    console.log("Local HTTP server listening at", localServerUrl);
  });

  return localServerUrl;
}

export function getLocalServerUrl(): string {
  return localServerUrl;
}

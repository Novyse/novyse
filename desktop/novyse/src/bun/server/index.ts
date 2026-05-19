import { serve } from "bun";
import { handleCaptchaRequest } from "./captcha";
import {
  handleFileGet,
  handleFilePost,
  handleFileDownload,
  handleFileCopy,
} from "./files";
import { FILES_DIR, ensureDirectoriesExist } from "../paths";

await ensureDirectoriesExist();

export function startLocalServer() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const localServer = serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (pathname === "/captcha") {
        return handleCaptchaRequest(req, corsHeaders);
      }

      if (pathname.startsWith("/files/")) {
        const key = decodeURIComponent(pathname.slice(7));
        if (!key) {
          return new Response("Key required", {
            status: 400,
            headers: corsHeaders,
          });
        }

        if (key === "download" && req.method === "POST") {
          return handleFileDownload(FILES_DIR, req, corsHeaders);
        }
        if (key === "copy" && req.method === "POST") {
          return handleFileCopy(FILES_DIR, req, corsHeaders);
        }

        // Standard GET / POST
        if (req.method === "GET" || req.method === "HEAD") {
          return handleFileGet(key, FILES_DIR, corsHeaders);
        }
        if (req.method === "POST") {
          return handleFilePost(key, FILES_DIR, req, corsHeaders);
        }
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
  });

  return localServer;
}

import * as fs from "fs";
import * as path from "path";
import { FILES_DIR } from "../paths";

export async function handleFileDownload(req: any, res: any) {
  try {
    const { url, key } = req.body;
    if (!url || !key) throw new Error("Missing url or key");

    const destination = path.join(FILES_DIR, key);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(destination, buffer);

    const mimeType =
      response.headers.get("content-type") || "application/octet-stream";
    await fs.promises.writeFile(destination + ".mime", mimeType);

    const fileStats = await fs.promises.stat(destination);
    res.json({ success: true, size: fileStats.size });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export async function handleFileCopy(req: any, res: any) {
  try {
    const { sourcePath, key } = req.body;
    if (!sourcePath || !key) throw new Error("Missing sourcePath or key");

    const destination = path.join(FILES_DIR, key);
    await fs.promises.copyFile(sourcePath, destination);

    const mimeType = "application/octet-stream";
    await fs.promises.writeFile(destination + ".mime", mimeType);

    const fileStats = await fs.promises.stat(destination);
    res.json({ success: true, size: fileStats.size });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export async function handleFilePost(req: any, res: any) {
  try {
    const key = req.params.key;
    const destination = path.join(FILES_DIR, key);
    const mimeType = req.headers["content-type"] || "application/octet-stream";

    await fs.promises.writeFile(destination, req.body);
    await fs.promises.writeFile(destination + ".mime", mimeType);

    const fileStats = await fs.promises.stat(destination);
    res.json({ success: true, size: fileStats.size });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

export async function handleFileGet(req: any, res: any) {
  try {
    const key = req.params.key;
    const filePath = path.join(FILES_DIR, key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File Not Found");
    }

    let mimeType = "application/octet-stream";
    try {
      if (fs.existsSync(filePath + ".mime")) {
        mimeType = await fs.promises.readFile(filePath + ".mime", "utf-8");
        mimeType = mimeType.trim();
      }
    } catch (e) {}

    res.header("Content-Type", mimeType);
    res.header("Cache-Control", "public, max-age=31536000");

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (e: any) {
    res.status(500).send("Internal Server Error");
  }
}

export async function handleFileHead(req: any, res: any) {
  const key = req.params.key;
  const filePath = path.join(FILES_DIR, key);
  if (fs.existsSync(filePath)) {
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
}

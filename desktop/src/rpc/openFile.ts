import { join } from "path";
import { FILES_DIR } from "../paths";
import { shell } from "electron";
import { stat, readdir } from "fs/promises";
import type { OpenFileRequest, OpenFileResponse } from "../../../src/types/rpc";

export async function handleOpenFile(
  request: OpenFileRequest,
): Promise<OpenFileResponse> {
  try {
    const { fileRef } = request;
    if (!fileRef) {
      throw new Error("Missing fileRef");
    }

    let filePath = join(FILES_DIR, fileRef);
    let exists = await stat(filePath)
      .then(() => true)
      .catch(() => false);

    if (!exists && !fileRef.includes(".")) {
      try {
        const files = await readdir(FILES_DIR);
        const prefix = fileRef + ".";
        const found = files.find((f) => f.startsWith(prefix));
        if (found) {
          filePath = join(FILES_DIR, found);
          exists = true;
        }
      } catch {}
    }

    if (!exists) {
      throw new Error("File not found on disk");
    }

    const error = await shell.openPath(filePath);
    if (error) {
      throw new Error(`Failed to open file: ${error}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("electron:openFile error:", error.message);
    return { success: false, error: error.message };
  }
}

import { join } from "path";
import { FILES_DIR, OS_PLATFORM } from "../paths";
import type {
  OpenFileRequest,
  OpenFileResponse,
} from "../../../../../src/types/rpc";
import { readdir } from "fs/promises";

export async function handleOpenFile(
  request: OpenFileRequest,
): Promise<OpenFileResponse> {
  try {
    const { fileRef } = request;
    if (!fileRef) {
      throw new Error("Missing fileRef");
    }

    let filePath = join(FILES_DIR, fileRef);
    let file = Bun.file(filePath);
    let exists = await file.exists();

    if (!exists && !fileRef.includes(".")) {
      try {
        const files = await readdir(FILES_DIR);
        const prefix = fileRef + ".";
        const found = files.find((f) => f.startsWith(prefix));
        if (found) {
          filePath = join(FILES_DIR, found);
          file = Bun.file(filePath);
          exists = true;
        }
      } catch {}
    }

    if (!exists) {
      throw new Error("File not found on disk");
    }

    if (OS_PLATFORM === "darwin") {
      await Bun.spawn(["open", filePath]).exited;
    } else if (OS_PLATFORM === "win32") {
      await Bun.spawn(["cmd", "/c", "start", "", filePath]).exited;
    } else {
      await Bun.spawn(["xdg-open", filePath]).exited;
    }

    return { success: true };
  } catch (error: any) {
    console.error("bun:openFile error:", error.message);
    return { success: false, error: error.message };
  }
}

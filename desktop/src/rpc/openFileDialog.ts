import { dialog } from "electron";
import { stat } from "fs/promises";
import * as mime from "mime-types";
import type {
  OpenFileDialogRequest,
  OpenFileDialogResponse,
} from "../../../src/types/rpc";

export async function handleOpenFileDialog(
  request: OpenFileDialogRequest,
): Promise<OpenFileDialogResponse> {
  try {
    const { allowedFileTypes, allowsMultipleSelection } = request;
    const filters: { name: string; extensions: string[] }[] = [];

    if (allowedFileTypes) {
      const normalized = allowedFileTypes.replace(/\s+/g, "");
      if (normalized === "image/*") {
        filters.push({
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
        });
      } else if (
        normalized.includes("image/*") &&
        normalized.includes("video/*")
      ) {
        filters.push({
          name: "Media",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "svg",
            "mp4",
            "mov",
            "mp3",
            "wav",
            "m4a",
          ],
        });
      } else if (normalized !== "*/*") {
        filters.push({
          name: "Custom",
          extensions: normalized.split(",").map((e) => e.replace("*.", "")),
        });
      }
    }

    const properties: any[] = ["openFile"];
    if (allowsMultipleSelection ?? true) properties.push("multiSelections");

    const result = await dialog.showOpenDialog({ properties, filters });
    if (result.canceled) return { success: true, assets: [] };

    const assets = [];
    for (const path of result.filePaths) {
      try {
        const fileStats = await stat(path);
        const name = path.split("/").pop() || path.split("\\").pop() || "file";
        const mimeType = mime.lookup(path) || "application/octet-stream";

        assets.push({
          uri: `file://${path}`,
          name,
          size: fileStats.size,
          mimeType,
        });
      } catch (err) {
        console.error(`Failed to stat selected file ${path}:`, err);
      }
    }

    return { success: true, assets };
  } catch (error: any) {
    console.error("electron:openFileDialog error:", error.message);
    return { success: false, error: error.message };
  }
}

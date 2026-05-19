import { Utils } from "electrobun/bun";
import { stat } from "fs/promises";
import type {
  OpenFileDialogRequest,
  OpenFileDialogResponse,
} from "../../../../../src/types/rpc";

export async function handleOpenFileDialog(
  request: OpenFileDialogRequest,
): Promise<OpenFileDialogResponse> {
  try {
    const { allowedFileTypes, allowsMultipleSelection } = request;
    let nativeFilters = "*";
    if (allowedFileTypes) {
      const normalized = allowedFileTypes.replace(/\s+/g, "");
      if (normalized === "image/*") {
        nativeFilters =
          "png,jpg,jpeg,gif,webp,svg,*.png,*.jpg,*.jpeg,*.gif,*.webp,*.svg";
      } else if (
        normalized.includes("image/*") &&
        normalized.includes("video/*")
      ) {
        nativeFilters =
          "png,jpg,jpeg,gif,webp,svg,mp4,mov,mp3,wav,m4a,*.png,*.jpg,*.jpeg,*.gif,*.webp,*.svg,*.mp4,*.mov,*.mp3,*.wav,*.m4a";
      } else if (normalized === "*/*") {
        nativeFilters = "*";
      } else {
        nativeFilters = allowedFileTypes;
      }
    }

    const filePaths = await Utils.openFileDialog({
      allowedFileTypes: nativeFilters,
      allowsMultipleSelection: allowsMultipleSelection ?? true,
      canChooseFiles: true,
      canChooseDirectory: false,
    });
    const filteredPaths = filePaths.filter(Boolean);

    // Reconstruct paths that might have been incorrectly split due to commas in filenames
    const reconstructedPaths: string[] = [];
    let tempPath = "";

    for (let i = 0; i < filteredPaths.length; i++) {
      const currentPart = filteredPaths[i].trim();
      const candidate = tempPath ? `${tempPath}, ${currentPart}` : currentPart;

      // Try with comma + space (common in GTK / macOS output)
      const file1 = Bun.file(candidate);
      // Try with just comma
      const candidateNoSpace = tempPath
        ? `${tempPath},${currentPart}`
        : currentPart;
      const file2 = Bun.file(candidateNoSpace);

      if (await file1.exists()) {
        reconstructedPaths.push(candidate);
        tempPath = "";
      } else if (await file2.exists()) {
        reconstructedPaths.push(candidateNoSpace);
        tempPath = "";
      } else {
        // If it's the last element, or if the single part itself exists as a file, push it
        const singleFile = Bun.file(currentPart);
        if (await singleFile.exists()) {
          if (tempPath) {
            reconstructedPaths.push(tempPath);
          }
          reconstructedPaths.push(currentPart);
          tempPath = "";
        } else {
          tempPath = candidate;
        }
      }
    }

    if (tempPath) {
      reconstructedPaths.push(tempPath);
    }

    const assets = [];
    for (const path of reconstructedPaths) {
      try {
        const fileStats = await stat(path);
        const name = path.split("/").pop() || "file";
        const mimeType = Bun.file(path).type || "application/octet-stream";

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
    console.error("bun:openFileDialog error:", error.message);
    return { success: false, error: error.message };
  }
}

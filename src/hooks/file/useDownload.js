import { useCallback } from "react";
import { Platform } from "react-native";
import JSZip from "jszip";

import storage from "@/src/utils/storage/file";
import database from "@/src/utils/storage/database";
import queueManager from "@/src/utils/chat/queueManager";
import eventEmitter from "@/src/utils/global/Events/EventEmitter";

const useDownload = () => {
  /**
   * Resolves a file's local ref and URI, waiting for download if necessary.
   */
  const resolveFileRefAndUri = useCallback(async (file) => {
    if (!file || !file.uuid) return null;

    let fileInfo = await database.file.get.all(file.uuid);
    let ref = fileInfo?.ref;

    if (!ref) {
      console.log(
        `[useDownload] Ref missing for ${file.uuid}, triggering download job.`,
      );
      await queueManager.addInboundFileJob(file.uuid);

      // Wait for file:downloaded event
      const downloadedFile = await new Promise((resolve) => {
        const onFileDownloaded = (data) => {
          if (data.file && data.file.uuid === file.uuid) {
            console.log(`[useDownload] File ${file.uuid} is now ready.`);
            eventEmitter.getEmitter().off("file:downloaded", onFileDownloaded);
            resolve(data.file);
          }
        };
        eventEmitter.getEmitter().on("file:downloaded", onFileDownloaded);
      });

      ref = downloadedFile.ref;
      // Re-fetch info to get correct name/mime if it was updated
      fileInfo = await database.file.get.all(file.uuid);
    }

    const uri = await storage.read(ref);
    const mimeType = fileInfo?.mimeType || file.mimeType;
    let name = fileInfo?.name || file.name || file.fileName || "file";

    return {
      ref,
      uri,
      name,
      mimeType,
    };
  }, []);

  /**
   * Triggers the platform-specific download/share for a URI.
   */
  const triggerDownload = useCallback(async (uri, fileName, mimeType) => {
    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = uri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      try {
        // Ricordati che quando expo-file-system si sveglia e ti da StorageAccessFramework allora questo diventa una funzione a parte
        const { shareAsync, isAvailableAsync } = require("expo-sharing");
        if (await isAvailableAsync()) {
          const { File, Paths } = require("expo-file-system");
          const originalFile = new File(uri);
          const copiedFile = new File(Paths.cache, fileName);
          try {
            await originalFile.copy(copiedFile);
          } catch (_) {}
          await shareAsync(copiedFile.uri, {
            mimeType,
            dialogTitle: "Share file",
          });
        } else {
          console.error("Android download failed: Sharing is not available");
        }
      } catch (err) {
        console.error("Android download failed:", err);
      }
    }
  }, []);

  const downloadFile = useCallback(
    async (files) => {
      if (!files) return;

      const fileList = Array.isArray(files) ? files : [files];
      if (fileList.length === 0) return;

      try {
        if (fileList.length === 1) {
          // Single file download
          const resolved = await resolveFileRefAndUri(fileList[0]);
          if (resolved) {
            await triggerDownload(
              resolved.uri,
              resolved.name,
              resolved.mimeType,
            );
          }
        } else {
          // Multiple files: Create a ZIP
          console.log(`[useDownload] Zipping ${fileList.length} files...`);
          const zip = new JSZip();

          for (const file of fileList) {
            const resolved = await resolveFileRefAndUri(file);
            if (resolved) {
              // Get data as ArrayBuffer for zipping
              const data = await storage.getArrayBuffer(resolved.uri);
              if (data) {
                zip.file(resolved.name, data);
              }
            }
          }

          const zipFileName = "novyse_files.zip";
          const zipMimeType = "application/zip";

          if (Platform.OS === "web") {
            const content = await zip.generateAsync({ type: "blob" });
            const uri = URL.createObjectURL(content);
            await triggerDownload(uri, zipFileName, zipMimeType);
            URL.revokeObjectURL(uri);
          } else {
            // Mobile: Need to save to temporary file first
            const content = await zip.generateAsync({ type: "uint8array" });
            const { File, Paths } = require("expo-file-system");
            const tempFile = new File(Paths.cache, zipFileName);

            await tempFile.write(content);
            await triggerDownload(tempFile.uri, zipFileName, zipMimeType);
          }
        }
      } catch (error) {
        console.error("[useDownload] Bulk download error:", error);
      }
    },
    [resolveFileRefAndUri, triggerDownload],
  );

  return { downloadFile };
};

export default useDownload;

import { useCallback } from "react";
import { Platform as RNPlatform, Linking } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import { File, Paths } from "expo-file-system";
import useDownload from "@/src/hooks/file/useDownload";
import { filesRpc } from "@/src/utils/electron/files";
import Platform from "@/src/utils/device/type";

const useOpenFile = () => {
  const { resolveFileRefAndUri } = useDownload();

  /**
   * Ensures the cached file has the correct name (with extension) so that the
   * OS can identify the MIME type when opening it.
   *
   * Returns the final local URI.
   */
  const prepareLocalFile = useCallback(async (uri, name) => {
    if (!uri || !name) return uri;

    // If the URI already ends with the correct filename, nothing to do.
    if (uri.endsWith(name)) return uri;

    try {
      const sourceFile = new File(uri);
      if (!sourceFile.exists) return uri;

      const tempFile = new File(Paths.cache, name);
      if (tempFile.exists) {
        await tempFile.delete();
      }
      await sourceFile.copy(tempFile);
      return tempFile.uri;
    } catch (err) {
      console.error("[useOpenFile] Failed to copy file to cache:", err);
      return uri; // fall back to the original URI
    }
  }, []);

  /**
   * Opens a file with the system application across Desktop, Android, iOS, and Web.
   *
   * @param {{ uuid?: string, fileRef?: string, uri?: string, mimeType?: string, name?: string }} options
   */
  const openFile = useCallback(
    async ({ uuid, fileRef, uri, mimeType, name }) => {
      try {
        // 1. Handle Desktop (Electrobun / Electron filesRpc)
        if (Platform === "desktop") {
          const targetRef =
            fileRef ||
            (uuid
              ? (await resolveFileRefAndUri({ uuid, mimeType, name }))?.ref
              : null);
          if (targetRef) {
            filesRpc.openFile(targetRef);
          }
          return;
        }

        // 2. Mobile / Web Resolution
        let finalUri = uri;
        let finalName = name;
        let finalMimeType = mimeType;

        if (uuid) {
          const resolved = await resolveFileRefAndUri({
            uuid,
            mimeType,
            name,
          });
          if (!resolved) {
            console.warn(
              "[useOpenFile] Could not resolve file for UUID:",
              uuid,
            );
            return;
          }
          finalUri = resolved.uri;
          finalName = resolved.name;
          finalMimeType = resolved.mimeType;
        }

        if (!finalUri) {
          console.warn("[useOpenFile] No URI available to open.");
          return;
        }

        // 3. Android
        if (RNPlatform.OS === "android") {
          const localUri = await prepareLocalFile(finalUri, finalName);
          const fileObj = new File(localUri);
          const contentUri = fileObj.contentUri;

          try {
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: finalMimeType || "*/*",
              },
            );
          } catch (intentErr) {
            if (intentErr?.message?.includes("ActivityNotFoundException")) {
              console.warn(
                `[useOpenFile] No app found for MIME type ${finalMimeType}. Retrying with */*`,
              );
              await IntentLauncher.startActivityAsync(
                "android.intent.action.VIEW",
                {
                  data: contentUri,
                  flags: 1,
                  type: "*/*",
                },
              );
            } else {
              throw intentErr;
            }
          }
        }
        // 4. iOS
        else if (RNPlatform.OS === "ios") {
          const localUri = await prepareLocalFile(finalUri, finalName);
          const canOpen = await Linking.canOpenURL(localUri);
          if (canOpen) {
            await Linking.openURL(localUri);
          } else {
            console.warn("[useOpenFile] iOS cannot open URL:", localUri);
          }
        }
        // 5. Web fallback
        else {
          Linking.openURL(finalUri).catch((err) =>
            console.error("[useOpenFile] Failed to open URL on Web:", err),
          );
        }
      } catch (error) {
        console.error("[useOpenFile] Error opening file:", error);
      }
    },
    [resolveFileRefAndUri, prepareLocalFile],
  );

  return { openFile };
};

export default useOpenFile;

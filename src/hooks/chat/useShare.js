import { useCallback } from "react";
import { Share, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import useDownload from "@/src/hooks/file/useDownload";
import { File, Paths } from "expo-file-system";

/**
 * Hook to handle sharing of messages or individual files/text.
 */
const useShare = () => {
  const { resolveFileRefAndUri } = useDownload();

  /**
   * Shares a single file or text content.
   * @param {Object} options - { uuid, uri, content, mimeType, name }
   */
  const shareFileOrText = useCallback(
    async ({ uuid, uri, content, mimeType, name }) => {
      try {
        if (uuid || uri) {
          let finalUri = uri;
          let finalName = name;
          let finalMimeType = mimeType;

          if (uuid) {
            const resolved = await resolveFileRefAndUri({
              uuid,
              mimeType,
              name,
            });
            if (resolved) {
              finalUri = resolved.uri;
              finalName = resolved.name;
              finalMimeType = resolved.mimeType;
            }
          }

          if (finalUri) {
            // If on mobile, ensure the file has a correct name with extension in cache.
            // This fixes the issue where UUID-named files are misidentified by the OS.
            if (Platform.OS !== "web") {
              try {
                // Check if the current URI already ends with the correct name
                if (!finalUri.endsWith(finalName)) {
                  const sourceFile = new File(finalUri);
                  if (sourceFile.exists) {
                    const tempFile = new File(Paths.cache, finalName);
                    // Overwrite if temp file already exists
                    if (tempFile.exists) {
                      await tempFile.delete();
                    }
                    await sourceFile.copy(tempFile);
                    finalUri = tempFile.uri;
                  }
                }
              } catch (fsError) {
                console.error(
                  "[useShare] File system error while preparing file for share:",
                  fsError,
                );
                // Continue with the original URI as fallback
              }
            }

            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
              await Sharing.shareAsync(finalUri, {
                mimeType: finalMimeType,
                dialogTitle: finalName,
              });
              return;
            } else {
              // Fallback to RN Share for URI
              await Share.share({
                url: finalUri,
                message: content || finalName,
              });
              return;
            }
          }
        }

        if (content) {
          await Share.share({
            message: content,
          });
        }
      } catch (error) {
        console.error("[useShare] Error in shareFileOrText:", error);
      }
    },
    [resolveFileRefAndUri],
  );

  /**
   * Shares a message object.
   * @param {Object} message - The message object containing content and files.
   */
  const shareMessage = useCallback(
    async (message) => {
      if (!message) return;

      const { content, files } = message;

      if (files && files.length > 0) {
        // Prioritize sharing the first file of the message @SamueleOrazioDurante THIS WILL NEED CHANGES when the new select system is out
        const file = files[0];
        await shareFileOrText({
          uuid: file.uuid,
          uri: file.uri,
          content: content,
          mimeType: file.mimeType,
          name: file.name || file.fileName,
        });
      } else if (content) {
        await shareFileOrText({ content });
      }
    },
    [shareFileOrText],
  );

  return { shareMessage, shareFileOrText };
};

export default useShare;

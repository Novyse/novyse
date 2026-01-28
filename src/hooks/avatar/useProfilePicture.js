import { useEffect, useState } from "react";

import database from "@/src/utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";
import S3Uploader from "@/src/utils/storage/file/s3Bucket";
import storage from "@/src/utils/storage/file";

import useUriResolver from "@/src/hooks/file/useUriResolver";

const defaultProfilePictureUUID = "00000000-0000-0000-0000-000000000000"; // Default profile picture UUID

const useProfilePicture = (uuid, uri) => {
  const [ref, setRef] = useState(null);

  const downloadProfilePicture = async (fileUUID) => {
    // Download file metadata from server
    const { success, downloadURL, expiresAt, name, size, mimeType } =
      await gateway.file.retrieve(fileUUID);

    const fileInfo = {
      downloadURL,
      expiresAt,
      name,
      size,
      mimeType,
      uuid: fileUUID,
    };

    if (success && fileInfo && fileInfo.downloadURL) {
      // Insert file info into database if not exists
      await database.file.add(
        fileInfo.uuid,
        fileInfo.name,
        fileInfo.mimeType,
        fileInfo.size,
      );

      // Download file from S3 bucket
      const bytes = await S3Uploader.download(fileInfo.downloadURL);

      if (!bytes) {
        throw new Error("File download failed from S3");
      }
      // Save file to storage
      const { ref, size } = await storage.save.byBytes(bytes, fileUUID);

      if (!ref || !size || size <= 0) {
        const errorMsg = `File save to storage failed for file ${fileUUID}: ref=${ref}, size=${size}`;
        throw new Error(errorMsg);
      }

      if (fileInfo.size !== size) {
        const errorMsg = `Saved file size mismatch for file ${fileUUID}: expected ${fileInfo.size}, got ${size}`;
        throw new Error(errorMsg);
      }

      fileInfo.ref = ref;

      // Update file info in database
      await database.file.update.ref(fileUUID, ref);

      return ref;
    }
  };

  useEffect(() => {
    const fetchRef = async () => {
      console.log("Fetching profile picture ref for UUID:", uuid);
      if (uri) {
        setRef(null);
        return;
      }
      let uuidToFetch = uuid;
      if (!uuidToFetch) {
        uuidToFetch = defaultProfilePictureUUID;
      }
      try {
        const fetchedRef = await database.file.get.ref(uuidToFetch);
        if (!fetchedRef) {
          // Download file from backend
          const newRef = await downloadProfilePicture(uuidToFetch);
          setRef(newRef);
          return;
        }
        setRef(fetchedRef);
        return;
      } catch (error) {
        console.error("Profile picture ref fetch error:", error);
      }
    };
    fetchRef();
  }, [uuid, uri]);

  const { uri: resolvedUriFromHook } = useUriResolver(ref);

  if (uri) {
    return { uri };
  }
  return { uri: resolvedUriFromHook };
};

export default useProfilePicture;

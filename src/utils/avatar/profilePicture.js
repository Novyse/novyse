import database from "@/src/utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";
import S3Uploader from "@/src/utils/storage/file/s3Bucket";
import storage from "@/src/utils/storage/file";

const defaultProfilePictureUUID = "00000000-0000-0000-0000-000000000000";

export const downloadProfilePicture = async (fileUUID) => {
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

export const getProfilePictureUri = async (uuid) => {
  let uuidToFetch = uuid;
  if (!uuidToFetch) {
    uuidToFetch = defaultProfilePictureUUID;
  }
  try {
    let fetchedRef = await database.file.get.ref(uuidToFetch);
    if (!fetchedRef) {
      fetchedRef = await downloadProfilePicture(uuidToFetch);
    }
    if (fetchedRef) {
      return await storage.read(fetchedRef);
    }
    return null;
  } catch (error) {
    console.error("Profile picture ref fetch/download error:", error);
    return null;
  }
};

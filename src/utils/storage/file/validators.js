import { calculateTotalSize, formatFileSize } from "./utils";

export const validateFiles = (
  newFiles,
  fileType,
  maxFile,
  maxSingleSize,
  maxTotalSize
) => {
  let globalError = null;
  const invalidFilesData = [];

  // Check total file count
  if (newFiles.length > maxFile) {
    globalError = "Too many files. Maximum allowed: " + maxFile;
  }

  // Check total size
  if (calculateTotalSize(newFiles) > maxTotalSize) {
    globalError =
      "Total file size too large. Maximum allowed: " +
      formatFileSize(maxTotalSize);
  }

  // Check individual file sizes and mark invalid ones
  newFiles.forEach((file, index) => {
    const errors = [];
    const fileSize = file.size || file.fileSize || 0;

    if (fileSize > maxSingleSize) {
      errors.push(
        "File size exceeds maximum allowed size of " +
          formatFileSize(maxSingleSize)
      );
    }

    if (fileSize === 0) {
      errors.push("File size is 0. Please select a valid file.");
    }

    if (fileType !== "All") {
      const allowedType = fileType.toLowerCase();
      const fileMimeType = file.mimeType || file.type || "";
      if (
        (allowedType === "image" && !fileMimeType.startsWith("image/")) ||
        (allowedType === "video" && !fileMimeType.startsWith("video/"))
      ) {
        errors.push("File type not allowed. Allowed types: " + fileType);
      }
    }

    if (errors.length > 0) {
      invalidFilesData.push({ index, errors });
    }
  });

  if (globalError) {
    if (invalidFilesData.length === 0 && newFiles.length > 0) {
      invalidFilesData.push({ index: 0, errors: [globalError] });
    } else {
      invalidFilesData.forEach((d) => d.errors.push(globalError));
    }
  }

  return {
    globalError,
    invalidFilesData,
    hasErrors: globalError !== null || invalidFilesData.length > 0,
  };
};

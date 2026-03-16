import { useState } from "react";

import {
  calculateTotalSize,
  formatFileSize,
  formatTime,
} from "@/src/utils/storage/file/utils";

const useUploadFile = (
  fileType = "All",
  maxFile,
  maxSingleSize,
  maxTotalSize,
) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [invalidFiles, setInvalidFiles] = useState([]);

  /**
   * Check for errors in the selected files
   * @param {Array} newFiles
   * @returns {boolean} true if there are errors, false otherwise
   */
  const checkErrors = (newFiles) => {
    // Reset error and invalidFiles for new selection
    setError(null);
    setInvalidFiles([]);
    const invalidIndices = [];

    

    // Check total file count
    if (newFiles.length > maxFile) {
      setError("Too many files. Maximum allowed: " + maxFile);
      return true;
    }

    // Check total size
    if (calculateTotalSize(newFiles) > maxTotalSize) {
      setError(
        "Total file size too large. Maximum allowed: " +
          formatFileSize(maxTotalSize),
      );
      return true;
    }

    // Check individual file sizes and mark invalid ones
    const invalidFilesData = [];
    newFiles.forEach((file, index) => {
      const errors = [];
      const fileSize = file.size || file.fileSize || 0;
      if (fileSize > maxSingleSize) {
        errors.push(
          "File size exceeds maximum allowed size of " +
            formatFileSize(maxSingleSize),
        );
      }

      if (fileSize === 0) {
        errors.push("File size is 0. Please select a valid file.");
      }

      if (fileType !== "All") {
        const allowedType = fileType.toLowerCase();
        const fileMimeType = file.mimeType||file.type;
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
    setInvalidFiles(invalidFilesData);

    return invalidIndices.length > 0;
  };

  /**
   * Remove all files
   */
  const removeAllFiles = () => {
    setFiles([]);
    setInvalidFiles([]);
    setError(null);
  };

  /**
   * Remove file at specific index
   * @param {Int} index
   */

  const removeFileAtIndex = (index) => {
    const filteredFiles = files.filter((_, i) => i !== index);
    setFiles(filteredFiles);
    checkErrors(filteredFiles);
  };

  return {
    files,
    setFiles,
    error,
    setError,
    invalidFiles,
    setInvalidFiles,
    checkErrors,
    removeAllFiles,
    removeFileAtIndex,
  };
};

export default useUploadFile;

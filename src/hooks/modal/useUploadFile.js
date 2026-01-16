import { useState } from "react";

import { calculateTotalSize } from "@/src/utils/storage/file/utils";

const useUploadFile = (maxFile, maxSingleSize, maxTotalSize) => {
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
      setError("Total file size too large. Maximum allowed: 2GB");
      return true;
    }

    // Check individual file sizes and mark invalid ones
    newFiles.forEach((file, index) => {
      if (file.size > maxSingleSize) {
        invalidIndices.push(index);
      }
    });

    setInvalidFiles(invalidIndices);

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

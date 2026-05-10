import { useState } from "react";

import { validateFiles } from "@/src/utils/storage/file/validators";

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

    const validationResult = validateFiles(
      newFiles,
      fileType,
      maxFile,
      maxSingleSize,
      maxTotalSize
    );

    if (validationResult.globalError) {
      setError(validationResult.globalError);
    }
    
    setInvalidFiles(validationResult.invalidFilesData);

    return validationResult.hasErrors;
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

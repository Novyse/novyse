class S3Uploader {
  /**
   * Uploads a file to S3 using a presigned URL with progress tracking.
   * @param {string} presignedUrl - The presigned S3 URL for upload.
   * @param {string} fileUri - The URI of the file to upload (e.g., blob URL or data URL).
   * @param {function} onProgress - Callback function called with { loaded: number, total: number }.
   * @returns {Promise<boolean>} - True if upload successful, false otherwise.
   */
  static async upload(presignedUrl, fileUri, onProgress = null) {
    return new Promise(async (resolve) => {
      try {
        if (!presignedUrl || !fileUri) {
          throw new Error("Presigned URL and file URI are required.");
        }

        // Fetch the file as a blob
        const response = await fetch(fileUri);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch file from URI: ${response.statusText}`
          );
        }
        const blob = await response.blob();

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl, true);
        xhr.setRequestHeader(
          "Content-Type",
          blob.type || "application/octet-stream"
        );

        xhr.upload.onprogress = (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress({ loaded: event.loaded, total: event.total });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log("File uploaded successfully to S3.");
            resolve(true);
          } else {
            throw new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
          }
        };

        xhr.onerror = () => {
          console.error("Error uploading file to S3:", xhr.statusText);
          resolve(false);
        };

        xhr.send(blob);
      } catch (error) {
        console.error("Error uploading file to S3:", error);
        resolve(false);
      }
    });
  }
}
export default S3Uploader;
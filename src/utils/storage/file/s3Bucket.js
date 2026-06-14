import storage from "./index";
import Platform from "@/src/utils/device/type";
class S3Uploader {
  static activeTransfers = new Map();

  /**
   * Uploads a file to S3 using a presigned URL with progress tracking.
   * @param {string} presignedUrl - The presigned S3 URL for upload.
   * @param {string} fileUri - The URI of the file to upload (e.g., blob URL).
   * @param {string} fileUUID - The UUID of the file.
   * @param {function} onProgress - Callback function called with { loaded: number, total: number }.
   * @returns {Promise<boolean>} - True if upload successful, false otherwise.
   */
  static async upload(presignedUrl, fileUri, fileUUID, onProgress = null) {
    return new Promise(async (resolve) => {
      try {
        if (!presignedUrl || !fileUri) {
          throw new Error("Presigned URL and file URI are required.");
        }

        const blob = await storage.getBlob(fileUri);
        if (!blob) {
          throw new Error("Could not retrieve blob for the given file URI.");
        }

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl, true);
        xhr.setRequestHeader(
          "Content-Type",
          blob.type || "application/octet-stream",
        );

        S3Uploader.activeTransfers.set(fileUUID, xhr);

        if (onProgress) {
          onProgress({ loaded: 0, total: blob.size || 0 });
        }

        xhr.upload.onprogress = (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress({ loaded: event.loaded, total: event.total });
          }
        };

        xhr.onload = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            console.error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
            resolve(false);
          }
        };

        xhr.onerror = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          console.error("Error uploading file to S3:", xhr.statusText);
          resolve(false);
        };

        xhr.onabort = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          resolve("CANCELLED");
        };

        xhr.send(blob);
      } catch (error) {
        console.error("Error uploading file to S3:", error);
        S3Uploader.activeTransfers.delete(fileUUID);
        resolve(false);
      }
    });
  }

  /**
   * Downloads a file from S3 using a presigned URL with progress tracking.
   * @param {String} presignedUrl
   * @param {String} fileUUID
   * @param {Function} onProgress
   * @returns {Promise<Blob|null>} - The downloaded file as a Blob, or null on failure.
   */
  static async download(presignedUrl, fileUUID, onProgress = null) {
    return new Promise(async (resolve) => {
      try {
        if (!presignedUrl) {
          throw new Error("Presigned URL is required.");
        }
        const xhr = new XMLHttpRequest();
        xhr.open("GET", presignedUrl, true);

        S3Uploader.activeTransfers.set(fileUUID, xhr);

        xhr.responseType = S3Uploader.getResponseType();
        xhr.onprogress = (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress({ loaded: event.loaded, total: event.total });
          }
        };
        xhr.onload = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log("File downloaded successfully from S3.");
            resolve(xhr.response);
          } else {
            console.error(`Download failed: ${xhr.status} ${xhr.statusText}`);
            resolve(null);
          }
        };
        xhr.onerror = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          console.error("Error downloading file from S3:", xhr.statusText);
          resolve(null);
        };
        xhr.onabort = () => {
          S3Uploader.activeTransfers.delete(fileUUID);
          resolve("CANCELLED");
        };
        xhr.send();
      } catch (error) {
        console.error("Error downloading file from S3:", error);
        S3Uploader.activeTransfers.delete(fileUUID);
        resolve(null);
      }
    });
  }

  static cancel(fileUUID) {
    if (S3Uploader.activeTransfers.has(fileUUID)) {
      S3Uploader.activeTransfers.get(fileUUID).abort();
    }
  }

  static getResponseType() {
    switch (Platform) {
      case "web":
      case "desktop":
        return "blob";
      case "mobile":
        return "arraybuffer";
      default:
        throw new Error(`Unsupported platform: ${Platform}`);
    }
  }

  static getSizeFromBytes(bytes) {
    return bytes ? bytes.size || bytes.byteLength || -1 : -1;
  }
}
export default S3Uploader;

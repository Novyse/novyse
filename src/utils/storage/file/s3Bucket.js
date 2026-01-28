import storage from "./index";
import { getPlatform } from "../../device/type";

class S3Uploader {
  /**
   * Uploads a file to S3 using a presigned URL with progress tracking.
   * @param {string} presignedUrl - The presigned S3 URL for upload.
   * @param {string} fileUri - The URI of the file to upload (e.g., blob URL).
   * @param {function} onProgress - Callback function called with { loaded: number, total: number }.
   * @returns {Promise<boolean>} - True if upload successful, false otherwise.
   */
  static async upload(presignedUrl, fileUri, onProgress = null) {
    return new Promise(async (resolve) => {
      try {
        if (!presignedUrl || !fileUri) {
          throw new Error("Presigned URL and file URI are required.");
        }

        const blob = await storage.getBlob(fileUri);
        if (!blob) {
          throw new Error("Could not retrieve blob for the given file URI.");
        }

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

  /**
   * Downloads a file from S3 using a presigned URL with progress tracking.
   * @param {String} presignedUrl
   * @param {Function} onProgress
   * @returns {Promise<Blob|null>} - The downloaded file as a Blob, or null on failure.
   */
  static async download(presignedUrl, onProgress = null) {
    return new Promise(async (resolve) => {
      try {
        if (!presignedUrl) {
          throw new Error("Presigned URL is required.");
        }
        const xhr = new XMLHttpRequest();
        xhr.open("GET", presignedUrl, true);

        xhr.responseType = S3Uploader.getResponseType();
        xhr.onprogress = (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress({ loaded: event.loaded, total: event.total });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log("File downloaded successfully from S3.");
            resolve(xhr.response);
          } else {
            throw new Error(`Download failed: ${xhr.status} ${xhr.statusText}`);
          }
        };
        xhr.onerror = () => {
          console.error("Error downloading file from S3:", xhr.statusText);
          resolve(null);
        };
        xhr.send();
      } catch (error) {
        console.error("Error downloading file from S3:", error);
        resolve(null);
      }
    });
  }

  static getResponseType() {
    const platform = getPlatform();
    switch (platform) {
      case "web":
        return "blob";
      case "mobile":
        return "arraybuffer";
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static getSizeFromBytes(bytes) {
    return bytes ? bytes.size || bytes.byteLength || -1 : -1;
  }
}
export default S3Uploader;

import { getElectronUrl } from "../../../electron/url";

const getLocalServerUrl = () => {
  return getElectronUrl();
};

const DesktopStorage = {
  save: {
    /**
     * Save a file by its URI.
     * @param {string} uri - The URI of the file to save.
     * @param {string} key - Optional key for the file.
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byUri: async (uri, key = null) => {
      if (!uri) {
        throw new Error("URI is required to save a file.");
      }
      try {
        const finalKey = key || uri.split("/").pop() || Date.now().toString();
        const serverUrl = getLocalServerUrl();

        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          // Remote download: Streamed directly in Bun main process via local HTTP server
          const response = await fetch(`${serverUrl}/files/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: uri, key: finalKey }),
          });
          const res = await response.json();
          if (!res.success)
            throw new Error(res.error || "Failed to download remote file");
          return { ref: finalKey, size: res.size };
        } else if (uri.startsWith("file://") || uri.startsWith("/")) {
          // Local physical path: Streamed/copied directly in Bun main process via local HTTP server
          const sourcePath = uri.startsWith("file://") ? uri.slice(7) : uri;
          const response = await fetch(`${serverUrl}/files/copy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourcePath, key: finalKey }),
          });
          const res = await response.json();
          if (!res.success)
            throw new Error(res.error || "Failed to copy local file");
          return { ref: finalKey, size: res.size };
        } else if (uri.startsWith("blob:") || uri.startsWith("http:")) {
          // Browser Blob URL or Local HTTP URL: loaded as Blob and uploaded via POST
          const response = await fetch(uri);
          const blob = await response.blob();
          return await DesktopStorage.save.byBlob(blob, finalKey);
        } else {
          throw new Error(`Unsupported URI scheme for desktop: ${uri}`);
        }
      } catch (err) {
        console.error("DesktopStorage: Could not save file from URI", err);
        throw err;
      }
    },
    /**
     * Save a file by its Blob or ArrayBuffer.
     * @param {Blob|ArrayBuffer} data
     * @param {string} key - Optional key for the file.
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byBlob: async (data, key = null) => {
      if (!data) {
        throw new Error("Data is required to save a file.");
      }
      try {
        const blob = data instanceof Blob ? data : new Blob([data]);
        const size = blob.size;
        const finalKey = key || Date.now().toString();

        const serverUrl = getLocalServerUrl();
        const response = await fetch(`${serverUrl}/files/${encodeURIComponent(finalKey)}`, {
          method: "POST",
          body: blob,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to upload file to local server: ${response.statusText}`,
          );
        }

        const res = await response.json();
        return { ref: finalKey, size: res.size || size };
      } catch (err) {
        console.error("DesktopStorage: Could not save blob", err);
        throw err;
      }
    },
    /**
     * Save a file by its ArrayBuffer.
     */
    byArrayBuffer: async (arrayBuffer, key = null) => {
      return await DesktopStorage.save.byBlob(arrayBuffer, key);
    },
  },

  /**
   * Retrieve local URL from desktop filesystem.
   * Leverages the unified local HTTP server for zero IPC overhead!
   * @param {string} key
   * @returns {Promise<string|null>} The object URI or null if not found
   */
  read: async (key) => {
    try {
      const hasFile = await DesktopStorage.exists(key);
      if (hasFile) {
        const serverUrl = getLocalServerUrl();
        return `${serverUrl}/files/${encodeURIComponent(key)}`;
      }
      return null;
    } catch (err) {
      console.error("DesktopStorage: Could not read file", err);
      return null;
    }
  },

  /**
   * Check if file exists.
   */
  exists: async (key) => {
    try {
      const serverUrl = getLocalServerUrl();
      const response = await fetch(`${serverUrl}/files/${encodeURIComponent(key)}`, {
        method: "HEAD",
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  },

  getBlob: async (uri) => {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URI: ${response.statusText}`,
        );
      }
      return await response.blob();
    } catch (err) {
      console.error("DesktopStorage: Could not get blob", err);
      return null;
    }
  },

  /**
   * Get the arrayBuffer of the file
   * @param {String} uri
   * @returns {Promise<ArrayBuffer|null>}
   */
  getArrayBuffer: async (uri) => {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URI: ${response.statusText}`,
        );
      }
      return await response.arrayBuffer();
    } catch (err) {
      console.error("DesktopStorage: Could not get arrayBuffer", err);
      return null;
    }
  },

  /**
   * Get the URI from a blob
   * @param {Blob} blob
   * @returns {Promise<string|null>}
   */
  getUri: async (blob) => {
    try {
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("DesktopStorage: Could not get URI from blob", err);
      return null;
    }
  },
};

export default DesktopStorage;

import { File, Directory, Paths } from "expo-file-system";

const FileSystemUtil = {
  /**
   * Save a file from URI to Expo File System.
   * @param {String} uri - The file URI (file:// or http/https)
   * @returns {Promise<{ref: string, size: number}>} The file reference and size
   */
  save: async (uri) => {
    try {
      const key = uri.split("/").pop();
      const destination = new File(Paths.document, key);
      let file;
      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        file = await File.downloadFileAsync(uri, destination);
      } else if (uri.startsWith("file://")) {
        const sourceFile = new File(uri);
        await sourceFile.copy(destination);
        file = destination;
      } else {
        throw new Error("Unsupported URI scheme");
      }
      if (file.size === 0) {
        throw new Error("Downloaded file is empty");
      }
      return { ref: key, size: file.size };
    } catch (err) {
      console.error("[FILES_DB]: Could not save file", err);
      throw err;
    }
  },

  /**
   * Retrieve a file URI from Expo File System.
   * @param {string} key
   * @returns {string|null} The file URI or null if not found
   */
  read: async (key) => {
    try {
      const file = new File(Paths.document, key);
      if (file.exists) {
        return file.uri;
      }
      return null;
    } catch (err) {
      console.error("[FILES_DB]: Could not retrieve file", err);
      return null;
    }
  },
  /**
   * Get the size of the file
   * @param {string} ref
   * @returns {Promise<number|null>} The file size in bytes or null if not found
   */
  getSize: async (ref) => {
    try {
      const file = new File(ref);
      return file.exists ? file.size : null;
    } catch (err) {
      console.error("[FILES_DB]: Could not get file size", err);
      return null;
    }
  },
  /**
   * Get the blob of the file
   * @param {string} uriOrKey - The file URI (file://) or key (for saved files in Paths.document)
   * @returns {Promise<Blob|null>} The file blob or null if not found
   */
  getBlob: async (uriOrKey) => {
    try {
      let file;
      if (uriOrKey.startsWith("file://")) {
        file = new File(uriOrKey);
      } else {
        file = new File(Paths.document, uriOrKey);
        if (!file.exists) return null;
      }
      return await file.arrayBuffer();
    } catch (err) {
      console.error("[FILES_DB]: Could not get file blob", err);
      return null;
    }
  },
  getUri: async (blob, key) => {
    try {
      const file = new File(Paths.document, key);
      // Write blob to file
      file.write(new Uint8Array(blob)); // It is an arrayBuffer, not a Blob object
      return file.uri;
    } catch (err) {
      console.error("[FILES_DB]: Could not get URI from blob", err);
      return null;
    }
  },
};

export default FileSystemUtil;

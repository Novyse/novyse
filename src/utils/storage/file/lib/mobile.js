import { File, Directory, Paths } from "expo-file-system";

const FileSystemUtil = {
  save: {
    /**
     * Save a file by its URI.
     * @param {string} uri - The URI of the file to save.
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byUri: async (uri) => {
      if (!uri) {
        throw new Error("URI is required to save a file.");
      }
      try {
        const key = uri.split("/").pop();

        const sourceFile = new File(uri);
        if (!sourceFile.exists) {
          throw new Error("Source file does not exist");
        }

        const destination = new File(Paths.document, key);
        if (destination.exists) {
          destination.delete();
        }
        sourceFile.copy(destination);
        const file = destination;

        return { ref: key, size: file.size };
      } catch (err) {
        console.error("Could not save file", err);
        throw err;
      }
    },
    /**
     * Save a file by its ArrayBuffer.
     * @param {ArrayBuffer} arrayBuffer
     * @param {String} key
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byArrayBuffer: async (arrayBuffer, key) => {
      if (!arrayBuffer) {
        throw new Error("ArrayBuffer is required to save a file.");
      }
      try {
        const file = new File(Paths.document, key);
        // Write arrayBuffer to file
        file.write(new Uint8Array(arrayBuffer));
        return { ref: key, size: file.size };
      } catch (err) {
        console.error("Could not save file from ArrayBuffer", err);
        throw err;
      }
    },
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
};

export default FileSystemUtil;

import localforage from "localforage";

const blobStore = localforage.createInstance({
  name: "NovyseFiles",
  storeName: "novyse_blob_files",
});

const DB = {
  /**
   * Save a blob file into IndexedDB.
   * @param {String} uri - The file URI
   * @returns {Promise<{ref: string, size: number}>} The file reference and size
   */
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
        const response = await fetch(uri);
        const blob = await response.blob();
        return await DB.save.byBlob(blob, key || uri.split("/").pop());
      } catch (err) {
        console.error("Could not save file from URI", err);
        throw err;
      }
    },
    /**
     * Save a file by its Blob.
     * @param {Blob} blob
     * @param {string} key - Optional key for the file.
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byBlob: async (blob, key = null) => {
      if (!blob) {
        throw new Error("Blob is required to save a file.");
      }
      try {
        const size = blob.size;
        const finalKey = key || Date.now().toString();

        await blobStore.setItem(finalKey, {
          key: finalKey,
          blob,
        });
        return { ref: finalKey, size };
      } catch (err) {
        console.error("Could not save blob", err);
        throw err;
      }
    },
  },

  /**
   * Retrieve a blob file URL from IndexedDB.
   * @param {string} key
   * @returns {string|null} The object URI or null if not found
   */
  read: async (key) => {
    try {
      const item = await blobStore.getItem(key);
      if (item && item.blob) {
        return URL.createObjectURL(item.blob);
      }
      return null;
    } catch (err) {
      console.error("[FILES_DB]: Could not retrieve file", err);
      return null;
    }
  },

  /**
   * Delete a file from IndexedDB.
   * @param {string} key
   * @return {Promise<Void>}
   */
  delete: async (key) => {
    try {
      await blobStore.removeItem(key);
    } catch (err) {
      console.error("[FILES_DB]: Could not delete file", err);
    }
  },

  /**
   * Check if a file exists in IndexedDB.
   * @param {string} key
   * @return {Promise<Boolean>}
   */
  exists: async (key) => {
    const item = await blobStore.getItem(key);
    return !!item;
  },

  /**
   * Clear all files from IndexedDB.
   * @return {Promise<Void>}
   */
  clearAll: async () => {
    await blobStore.clear();
    console.log("[FILES_DB]: All files cleared");
  },

  /**
   * Get the blob of the file
   * @param {String} uri
   * @returns
   */
  getBlob: async (uri) => {
    try {
      // Handle all URIs with fetch
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URI: ${response.statusText}`,
        );
      }
      const blob = await response.blob();

      return blob;
    } catch (err) {
      console.error("Could not get blob", err);
      return null;
    }
  },

  /**
   * Get the arrayBuffer of the file
   * @param {String} uri
   * @returns
   */
  getArrayBuffer: async (uri) => {
    try {
      // Handle all URIs with fetch
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from URI: ${response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();

      return arrayBuffer;
    } catch (err) {
      console.error("Could not get arrayBuffer", err);
      return null;
    }
  },

  /**
   * Get the URI from a blob
   * @param {Blob} blob
   * @returns
   */
  getUri: async (blob) => {
    try {
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Could not get URI from blob", err);
      return null;
    }
  },
};

export default DB;

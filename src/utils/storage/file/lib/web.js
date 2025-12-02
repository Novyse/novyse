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
  save: async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const size = blob.size;

      const key = uri.split("/").pop();

      await blobStore.setItem(key, {
        key,
        blob,
      });
      return { ref: key, size };
    } catch (err) {
      console.error("[FILES_DB]: Could not save file", err);
      throw err;
    }
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
};

export default DB;

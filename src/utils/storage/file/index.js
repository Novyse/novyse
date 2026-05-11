import web from "./lib/web";
import mobile from "./lib/mobile";
import { Platform } from "react-native";

import { getPlatform } from "../../device/type";

const storage = {
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
      let ref = undefined;
      let size = -1;

      const platform = getPlatform();

      switch (platform) {
        case "web": {
          const result = await web.save.byUri(uri);
          ref = result.ref;
          size = result.size;
          break;
        }
        case "mobile": {
          const result = await mobile.save.byUri(uri);
          ref = result.ref;
          size = result.size;
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return { ref, size };
    },
    /**
     * Save a file by its raw bytes.
     * @param {Blob | ArrayBuffer } bytes - The raw bytes of the file to save.\
     * @param {String} key - Optional key/uuid for the file.
     * @returns {Promise<{ref: string, size: number}>} The file reference and size
     */
    byBytes: async (bytes, key = null) => {
      if (!bytes) {
        throw new Error("Bytes are required to save a file.");
      }
      let ref = undefined;
      let size = -1;
      const platform = getPlatform();

      switch (platform) {
        case "web": {
          const result = await web.save.byBlob(bytes, key);
          ref = result.ref;
          size = result.size;
          break;
        }
        case "mobile": {
          const result = await mobile.save.byArrayBuffer(bytes, key);
          ref = result.ref;
          size = result.size;
          break;
        }
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      return { ref, size };
    },
  },

  async read(ref) {
    let uri = undefined;
    if (Platform.OS === "web") {
      // Web
      uri = await web.read(ref);
    } else {
      // Mobile
      uri = await mobile.read(ref);
    }
    return uri;
  },

  async getBlob(uri) {
    if (Platform.OS === "web") {
      // Web
      return await web.getBlob(uri);
    } else {
      // Mobile
      return await mobile.getBlob(uri);
    }
  },

  async getArrayBuffer(uri) {
    if (Platform.OS === "web") {
      // Web
      return await web.getArrayBuffer(uri);
    } else {
      // Mobile
      return await mobile.getBlob(uri);
    }
  },

  async getUri(blob, uuid) {
    if (Platform.OS === "web") {
      // Web
      return await web.getUri(blob);
    } else {
      // Mobile
      return await mobile.getUri(blob, uuid);
    }
  },
};

export default storage;

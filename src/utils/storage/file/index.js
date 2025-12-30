import web from "./lib/web";
import mobile from "./lib/mobile";
import { Platform } from "react-native";

const storage = {
  /**
   * Saves a file to storage and returns a reference.
   * @param {string} uri - The URI of the file to save.
   * @param {boolean} isInternal - Whether to save the file internally (mobile only).
   * @returns {Promise<{ref: string, size: number}>} The file reference and size
   */
  async save(uri, isInternal = false) {
    if (!uri) {
      throw new Error("URI is required to save a file.");
    }

    let ref = undefined;
    let size = -1;

    if (Platform.OS === "web") {
      // Web
      const result = await web.save(uri);
      ref = result.ref;
      size = result.size;
    } else if (Platform.OS != "web") {
      // Mobile
      if (isInternal) {
        const result = await mobile.save(uri);
        ref = result.ref;
        size = result.size;
      } else {
        ref = uri;
        size = await mobile.getSize(ref);
      }
    } else if (Platform.OS === "WindowsOS") {
      // Windows
    }

    return { ref, size };
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

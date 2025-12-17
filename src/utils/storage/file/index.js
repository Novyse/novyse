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
        size = await mobile.getSize(uri); // da usare la libreria apposita
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
};

export default storage;

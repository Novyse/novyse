import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { rpc } from "@/src/utils/electrobun/rpc";

import Platform from "@/src/utils/device/type";

/**
 * Pick file(s) from device storage
 * @param {string} type Mime type to pick (default = all)
 * @returns {Array} Array of picked file assets
 */
const pickFile = async (type = "*/*") => {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (!result.canceled) {
    return result.assets;
  }
};

/**
 * Pick media (images/videos) from library
 * @param {Array} types Array of media types to pick: "images", "videos", "livePhotos"
 * @returns {Array} Array of picked media assets
 */
const pickMedia = async (types = ["images", "videos", "livePhotos"]) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    console.error(
      "Permission denied",
      "Sorry, we need camera roll permissions to make this work!",
    );
    return;
  }
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: types,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets;
    }
  } catch (error) {
    console.info("Error picking media:", error);
  }
};

export const openNativeFileMenu = async (type) => {
  switch (Platform) {
    case "mobile":
      return await openMobileFileMenu(type);
    case "web":
      return await openWebFileMenu(type);
    case "desktop":
      return await openDesktopFileMenu(type);
    default:
      console.warn("Unsupported platform for file picking");
  }
};

const openMobileFileMenu = async (type) => {
  switch (type) {
    case "Image":
      return await pickMedia(["images"]);
    case "Media":
      return await pickMedia();
    case "File":
      return await pickFile();
    default:
      console.warn("Unsupported file type for mobile file picking");
  }
};

const openWebFileMenu = async (type) => {
  // On web, media and file use the same picker
  let fileType = "*/*";
  switch (type) {
    case "Image":
      fileType = "image/*";
      break;
    case "Media":
      fileType = "image/*,video/*";
      break;
    case "File":
      fileType = "*/*";
      break;
    default:
      console.warn("Unsupported file type for web file picking");
  }

  return await pickFile(fileType);
};

const openDesktopFileMenu = async (type) => {
  // On desktop, media and file use the same picker
  let fileType = "*/*";
  switch (type) {
    case "Image":
      fileType = "image/*";
      break;
    case "Media":
      fileType = "image/*,video/*";
      break;
    case "File":
      fileType = "*/*";
      break;
    default:
      console.warn("Unsupported file type for desktop file picking");
  }

  try {
    const res = await rpc.request("openFileDialog", {
      allowedFileTypes: fileType,
      allowsMultipleSelection: true,
    });
    if (res.success && res.assets) {
      return res.assets;
    }
  } catch (error) {
    console.error("openDesktopFileMenu error:", error);
  }
  return [];
};

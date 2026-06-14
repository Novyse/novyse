import { getPlatform } from "@/src/utils/device/type";

export const getVideoDuration = async (uri) => {
  const platform = getPlatform();

  switch (platform) {
    case "web":
    case "desktop":
      return await getWebVideoDuration(uri);
    case "mobile":
      return await getMobileVideoDuration(uri);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

const getWebVideoDuration = async (uri) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = uri;

    video.onloadedmetadata = () => {
      resolve(video.duration);
    };

    video.onerror = () => reject("Could not load video metadata");
  });
};

const getMobileVideoDuration = async (uri) => {
  try {
    const { createVideoPlayer } = require("expo-video");

    const player = createVideoPlayer(uri);

    return new Promise((resolve) => {
      const subscription = player.addListener("statusChange", (status) => {
        if (player.duration > 0) {
          const duration = player.duration;
          subscription.remove();
          resolve(duration);
        }
      });
    });
  } catch (e) {
    console.error("Error getting video duration:", e);
    return 0;
  }
};

import storage from "@/src/utils/storage/file";
import { createAudioPlayer } from "expo-audio";

import { getWaveformData } from "@/src/utils/storage/file/audio";

const defaultWaveform = Array(50).fill(0);

const getWaveform = (ref, type) => {
  switch (type) {
    case "VOICE":
      return extractWaveformFromAudio(ref);
    default:
      return null;
  }
};

const extractWaveformFromAudio = async (ref) => {
  const uri = await storage.read(ref);
  return await getWaveformData(uri, 50);
};

const getDuration = async (ref, type) => {
  switch (type) {
    case "AUDIO":
    case "VOICE":
      return await extractDurationFromAudio(ref);
    case "VIDEO":
      return await extractDurationFromVideo(ref);
    default:
      return 0;
  }
};

const extractDurationFromAudio = async (ref) => {
  const uri = await storage.read(ref);
  const player = createAudioPlayer(uri);
  return new Promise((resolve, reject) => {
    const audio = player.media;
    audio.addEventListener("loadedmetadata", () => {
      const duration = audio.duration;
      player.remove();
      resolve(duration);
    });
    audio.addEventListener("error", (error) => {
      player.remove();
      reject(error);
    });
  });
};
const extractDurationFromVideo = async (ref) => {
  return await extractDurationFromAudio(ref);
};

export { defaultWaveform, getWaveform, getDuration };

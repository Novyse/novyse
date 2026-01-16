import storage from "@/src/utils/storage/file";
import { createAudioPlayer } from "expo-audio";

import { getPlatform } from "@/src/utils//device/type";

import { getVideoDuration } from "@/src/utils/storage/file/video";

import {
  getAudioDuration,
  getWaveformData,
} from "@/src/utils/storage/file/audio";

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

  return await getAudioDuration(uri);
};
const extractDurationFromVideo = async (ref) => {
  const uri = await storage.read(ref);

  return await getVideoDuration(uri);
};

export { defaultWaveform, getWaveform, getDuration };

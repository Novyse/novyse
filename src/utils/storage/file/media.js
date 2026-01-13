import storage from "@/src/utils/storage/file";
import { createAudioPlayer } from "expo-audio";

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
  // Placeholder implementation for audio waveform extraction
  // In a real implementation, you would process the audio bytes to extract waveform data
  return [
    0.73716100166034, 0.8367726846214676, 0.9008939948296025,
    0.09882654568369253, 0.8690468149905026, 0.8674881230598692,
    0.9371662430963056, 0.3849818409465632, 0.19440798966290818,
    0.5605540357238272, 0.074936275289605, 0.3989874853202968,
    0.521771227000656, 0.5089968475655664, 0.704075080688916,
    0.28783149580929834, 0.21699942603387434, 0.5281898560411679,
    0.1831154253261683, 0.12716470396849888, 0.4122528861262833,
    0.1715969578855161, 0.6310459718695424, 0.09842093651014538,
    0.7479440213899051, 0.9932769939202695, 0.04382693945036775,
    0.6227014948471391, 0.5584989143680368, 0.19074663669159797,
    0.15791723104187105, 0.6440094874130156, 0.2315559454362116,
    0.47229984631969457, 0.17746743446091684, 0.9121261928608526,
    0.9871108570383447, 0.9557247176680778, 0.9982715796738065,
    0.03168442997752996, 0.9529861926800227, 0.66672964897243,
    0.7374558843917352, 0.8998779988031088, 0.9566768850889973,
    0.3242465157439205, 0.8782431721467635, 0.40371289180690795,
    0.9754664229096691, 0.3789821606239272,
  ]; // Example waveform data

  const uri = await storage.read(ref);
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

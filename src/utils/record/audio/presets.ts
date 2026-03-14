import { IOSOutputFormat, AudioQuality } from "expo-audio";

export const RecordPreset = {
  "AAC": {
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 96000,
    isMeteringEnabled: true,
    android: {
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    ios: {
      outputFormat: IOSOutputFormat.MPEG4AAC,
      audioQuality: AudioQuality.MAX,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/aac",
      bitsPerSecond: 96000,
    },
  },
  "WAV": {
    extension: ".wav",
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 1411200,
    isMeteringEnabled: true,
    android: {
      outputFormat: "wav",
      audioEncoder: "pcm_16bit",
    },
    ios: {
      outputFormat: IOSOutputFormat.LINEARPCM,
      audioQuality: AudioQuality.MAX,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/wav",
      bitsPerSecond: 1411200,
    },
  },
};

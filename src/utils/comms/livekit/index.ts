import { Room, VideoPresets, ScreenSharePresets } from "livekit-client";

export const connectToLiveKit = async (url: string, token: string) => {
  const room = new Room({
    // automatically manage subscribed video quality
    adaptiveStream: true,

    // optimize publishing bandwidth and CPU for published tracks
    dynacast: true,

    // default publish settings
    publishDefaults: {
      audioPreset: {
        maxBitrate: 48_000,
      },
      videoEncoding: VideoPresets.h1080.encoding,
      simulcast: true,
    },

    // default audio settings
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },

    // default capture settings
    videoCaptureDefaults: {
      resolution: VideoPresets.h1080.resolution,
      frameRate: 60,
    },
  });

  console.log("Connecting to LiveKit...", { url, token });

  await room.connect(url, token);

  await room.startAudio();

  return room;
};

import {
  Room,
  VideoPresets,
} from "livekit-client";

export const connectToLiveKit = async (url: string, token: string) => {
  const room = new Room({
    // automatically manage subscribed video quality
    adaptiveStream: true,

    // optimize publishing bandwidth and CPU for published tracks
    dynacast: true,

    // default capture settings
    videoCaptureDefaults: {
      resolution: VideoPresets.h1080.resolution,
    },
  });

  console.log("Connecting to LiveKit...", { url, token });

  await room.connect(url, token);

  await room.startAudio();

  return room;
};

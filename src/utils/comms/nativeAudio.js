/**
 * Platform audio routing helpers for LiveKit comms.
 *
 * Web/desktop: mic and speaker are separate WebRTC devices
 * (Room.getLocalDevices + room.switchActiveDevice).
 *
 * Android: user picks an output route only; OS routes input+output together
 * (e.g. bluetooth = BT mic + BT speaker). See usesNativeAudioRouting.
 *
 * iOS: AudioSession still runs, but device pickers use WebRTC-style lists
 * where available — not the Android output-route UI.
 */
import { Platform } from "react-native";
import { Track } from "livekit-client";

/** Android only — linked input/output via AudioSession routes. */
export const usesNativeAudioRouting = Platform.OS === "android";

/** Web/Electron: we expose an audio-output picker (setSinkId / LiveKit). */
export const supportsWebAudioOutputSelection = Platform.OS === "web";

/** LiveKit throws this when the browser cannot switch audiooutput (e.g. Firefox/Safari). */
export const isUnsupportedWebAudioOutputError = (error) =>
  Platform.OS === "web" &&
  /cannot switch audiooutput|does not support/i.test(
    String(error?.message || error || ""),
  );

export const NATIVE_AUDIO_ROUTE_LABEL_PREFIX =
  "chat.comms.selectors.nativeAudioRoutes";

/** Route IDs shown in the speaker/output selector. */
export const NATIVE_SPEAKER_ROUTES = ["speaker", "bluetooth", "headset"];

const PREFERRED_ROUTE_ORDER = ["bluetooth", "headset", "earpiece", "speaker"];

export const getNativeAudioSession = () =>
  require("@livekit/react-native").AudioSession;

export const filterNativeSpeakerRoutes = (outputs) =>
  outputs.filter((outputId) => NATIVE_SPEAKER_ROUTES.includes(outputId));

export const getPreferredNativeAudioRoute = (outputs) => {
  for (const route of PREFERRED_ROUTE_ORDER) {
    if (outputs.includes(route)) return route;
  }
  return outputs[0] || "earpiece";
};

/** Initial/output route for the speaker selector (earpiece → speaker UI). */
export const getPreferredNativeSpeakerRoute = (outputs) => {
  const preferred = getPreferredNativeAudioRoute(outputs);
  if (preferred === "earpiece") return "speaker";
  if (NATIVE_SPEAKER_ROUTES.includes(preferred)) return preferred;
  return "speaker";
};

export const getNativeAudioOutputs = async () => {
  if (!usesNativeAudioRouting) return [];

  try {
    const AudioSession = getNativeAudioSession();
    const outputs = await AudioSession.getAudioOutputs();
    if (outputs?.length) return outputs;
  } catch (error) {
    console.warn("Failed to list native audio outputs", error);
  }

  return ["earpiece", "speaker"];
};

export const getNativeAudioRoutes = async (filterFn) => {
  const outputs = await getNativeAudioOutputs();
  return filterFn(outputs);
};

export const restartMicrophoneTrack = async (room) => {
  if (!room?.localParticipant?.isMicrophoneEnabled) return;

  const publication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  );
  const track = publication?.track;

  if (track?.restartTrack) {
    await track.restartTrack();
    return;
  }

  await room.localParticipant.setMicrophoneEnabled(false);
  await room.localParticipant.setMicrophoneEnabled(true);
};

export const selectNativeAudioRoute = async (room, routeId) => {
  if (!usesNativeAudioRouting || !routeId) return;

  const AudioSession = getNativeAudioSession();
  await AudioSession.selectAudioOutput(routeId);
  await restartMicrophoneTrack(room);
};

/** Resolve preferred Android speaker route and optionally apply it. */
export const ensureNativeSpeakerRoute = async (room, { apply = false } = {}) => {
  const outputs = await getNativeAudioOutputs();
  const route = getPreferredNativeSpeakerRoute(outputs);
  if (apply && room) {
    await selectNativeAudioRoute(room, route);
  }
  return route;
};

export const startNativeAudioSession = async () => {
  if (Platform.OS === "web") return;

  const { AudioSession, AndroidAudioTypePresets } =
    require("@livekit/react-native");

  await AudioSession.configureAudio({
    android: {
      preferredOutputList: ["bluetooth", "headset", "speaker", "earpiece"],
      audioTypeOptions: AndroidAudioTypePresets.communication,
    },
  });
  await AudioSession.startAudioSession();
};

export const stopNativeAudioSession = async () => {
  if (Platform.OS === "web") return;

  try {
    const AudioSession = getNativeAudioSession();
    await AudioSession.stopAudioSession();
  } catch (e) {
    console.error("Failed stopping native audio session", e);
  }
};

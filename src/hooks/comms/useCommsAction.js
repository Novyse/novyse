import { useState, useEffect, useRef } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useCommsContext } from "@/src/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";
import { connectToLiveKit } from "@/src/utils/comms/livekit";
import { Room, Track, LocalVideoTrack } from "livekit-client";
import { Camera } from "expo-camera";

import platform from "@/src/utils/device/type";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";
import {
  usesNativeAudioRouting,
  supportsWebAudioOutputSelection,
  isUnsupportedWebAudioOutputError,
  ensureNativeSpeakerRoute,
  selectNativeAudioRoute,
  startNativeAudioSession,
  stopNativeAudioSession,
} from "@/src/utils/comms/nativeAudio";

const isAbortError = (error) =>
  error?.name === "AbortError" ||
  error?.message === "AbortError" ||
  String(error?.message || "").includes("AbortError");

const getCameraCaptureFacingMode = (facingMode) =>
  facingMode === "user" ? "user" : "environment";

const getCameraRestartFacingMode = (facingMode) =>
  facingMode === "user" ? "front" : "environment";

const createCameraOperationQueue = () => {
  let chain = Promise.resolve();
  return (operation) => {
    chain = chain.catch(() => {}).then(operation);
    return chain;
  };
};

const getDeviceErrorMessage = (t) =>
  t("chat.bottomBar.overview.errors.deviceError", {
    troubleshooting: t("common.troubleshooting"),
    link: t("chat.bottomBar.overview.errors.troubleshootingLink"),
  });

/**
 * If LiveKit reports default/empty for a kind, pick the first listed device
 * and optionally switch to it.
 */
const resolveActiveDevice = async (
  roomInstance,
  kind,
  { switchDevice = true } = {},
) => {
  let deviceId = roomInstance.getActiveDevice(kind);
  if (deviceId && deviceId !== "default") return deviceId;

  try {
    const devices = await Room.getLocalDevices(kind);
    if (!devices.length) return deviceId;
    deviceId = devices[0].deviceId;
  } catch (e) {
    console.error(`Failed to list ${kind} devices`, e);
    return deviceId;
  }

  if (!switchDevice || !deviceId) return deviceId;

  try {
    await roomInstance.switchActiveDevice(kind, deviceId);
  } catch (e) {
    // Many browsers cannot switch audiooutput — keep the deviceId for UI/setSinkId.
    if (kind === "audiooutput" && isUnsupportedWebAudioOutputError(e)) {
      return deviceId;
    }
    console.error(`Failed to switch ${kind} device`, e);
  }

  return deviceId;
};

const publishAssociatedScreenTracks = async (localParticipant, tracks) => {
  const published = [];

  for (const track of tracks) {
    const isVideo = track.kind === "video";
    const publication = await localParticipant.publishTrack(track, {
      source: isVideo ? Track.Source.ScreenShare : Track.Source.ScreenShareAudio,
    });
    published.push({
      trackSid: publication.trackSid,
      track: publication.track ?? track,
      isVideo,
    });
  }

  const video = published.find((item) => item.isVideo);
  const audio = published.find((item) => !item.isVideo);
  if (video && audio) {
    video.track.associatedAudioSid = audio.trackSid;
    audio.track.associatedVideoSid = video.trackSid;
  }

  return published;
};

const useCommsAction = (chatUUID, sub) => {
  const {
    room,
    setRoom,
    connected,
    checkRoomMatch,
    reset,
    pinnedStreamUUID,
    setPinnedStreamUUID,
    fullscreenStreamUUID,
    setFullScreenStreamUUID,
    activeScreenShares,
    setActiveScreenShares,
    facingMode,
    setFacingMode,
    isAudioEnabled,
    setIsAudioEnabled,
    isAudioOutputEnabled,
    setIsAudioOutputEnabled,
    isVideoEnabled,
    setIsVideoEnabled,
    error,
    setError,
    setStreams,
    speakerDevice,
    setSpeakerDevice,
  } = useCommsContext();

  const { t } = useTranslation();

  const [connecting, setConnecting] = useState(false);
  const [roomMatch, setRoomMatch] = useState(false);
  const clearError = () => setError(null);

  const [microphoneDevice, setMicrophoneDevice] = useState(null);
  const [cameraDevice, setCameraDevice] = useState(null);
  const runCameraOperation = useRef(createCameraOperationQueue()).current;

  const syncVideoEnabledState = () => {
    if (room?.localParticipant) {
      setIsVideoEnabled(room.localParticipant.isCameraEnabled);
    }
  };

  const refreshLocalVideoStream = () => {
    if (!room?.localParticipant) return;

    const publication = room.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    const track = publication?.track;

    if (track?.mediaStreamTrack) {
      setStreams((prev) => ({
        ...prev,
        [room.localParticipant.identity]: new MediaStream([
          track.mediaStreamTrack,
        ]),
      }));
    }
  };

  const checkCameraPermission = async () => {
    if (Platform.OS === "web") {
      try {
        (
          await navigator.mediaDevices?.getUserMedia?.({ video: true })
        )
          ?.getTracks()
          .forEach((track) => track.stop());
        return true;
      } catch {
        return false;
      }
    }

    const existing = await Camera.getCameraPermissionsAsync();
    if (existing.granted) return true;

    const requested = await Camera.requestCameraPermissionsAsync();
    return requested.granted;
  };

  const applyCameraEnabledState = async (enabled) => {
    if (enabled && Platform.OS !== "web") {
      await room.localParticipant.setCameraEnabled(true, {
        facingMode: getCameraCaptureFacingMode(facingMode),
      });
      return;
    }

    await room.localParticipant.setCameraEnabled(enabled);
  };

  // @SamueleOrazioDurante temp init — replace with comms settings menu in 1.2
  const initHardwareDevices = async (roomInstance) => {
    if (!roomInstance?.localParticipant) return;

    if (!usesNativeAudioRouting) {
      setMicrophoneDevice(
        await resolveActiveDevice(roomInstance, "audioinput"),
      );
    }

    setCameraDevice(
      await resolveActiveDevice(roomInstance, "videoinput", {
        switchDevice: Platform.OS === "web",
      }),
    );

    if (supportsWebAudioOutputSelection) {
      setSpeakerDevice(
        await resolveActiveDevice(roomInstance, "audiooutput"),
      );
    } else if (usesNativeAudioRouting) {
      try {
        setSpeakerDevice(await ensureNativeSpeakerRoute(roomInstance));
      } catch (e) {
        console.error("Failed to init native speaker route", e);
        setSpeakerDevice("speaker");
      }
    }
  };

  useEffect(() => {
    setRoomMatch(checkRoomMatch(chatUUID, sub));
  }, [chatUUID, sub, checkRoomMatch]);

  useEffect(() => {
    if (room?.localParticipant) {
      setIsAudioEnabled(room.localParticipant.isMicrophoneEnabled);
      setIsVideoEnabled(room.localParticipant.isCameraEnabled);
      initHardwareDevices(room);
      return;
    }

    setIsAudioEnabled(false);
    setIsVideoEnabled(false);
    setMicrophoneDevice(null);
    setCameraDevice(null);
    if (supportsWebAudioOutputSelection || usesNativeAudioRouting) {
      setSpeakerDevice(null);
    }
  }, [room]);

  const join = async (overrideChatUUID, overrideSub) => {
    const targetChatUUID = overrideChatUUID ?? chatUUID;
    const targetSub = overrideSub ?? sub;

    setConnecting(true);
    if (connected) {
      leave();
    }

    try {
      const { success, token, url } = await gateway.comms.getToken(
        targetChatUUID,
        targetSub,
      );

      if (!success) {
        setError(
          "Failed to get token for LiveKit. No instances available. Please try again later.",
        );
        return;
      }

      const roomInstance = await connectToLiveKit(url, token);

      if (!roomInstance) {
        setError("Failed to connect to LiveKit");
        return;
      }

      await startNativeAudioSession();
      setRoom(roomInstance);
      SoundPlayer.getInstance().playSound("comms.join");

      // Delay mic enable so the room/AudioSession finish settling.
      setTimeout(async () => {
        if (!roomInstance.localParticipant) return;

        try {
          await roomInstance.localParticipant.setMicrophoneEnabled(true);

          if (usesNativeAudioRouting) {
            // Re-apply after mic is on so restartMicrophoneTrack can bind the route.
            const route = await ensureNativeSpeakerRoute(roomInstance, {
              apply: true,
            });
            setSpeakerDevice(route);
          } else {
            setMicrophoneDevice(roomInstance.getActiveDevice("audioinput"));
          }

          setIsAudioEnabled(true);
          setFacingMode("environment");
          setError(null);
        } catch (err) {
          console.error("Failed enabling microphone after join", err);
          setError(getDeviceErrorMessage(t));
        }
      }, 1000);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setError(t("chat.comms.error.chatFull"));
      } else {
        setError(t("chat.comms.error.generic"));
      }
    } finally {
      setConnecting(false);
    }
  };

  const leave = async () => {
    if (room) {
      room.disconnect();
      await stopNativeAudioSession();
      reset();
      SoundPlayer.getInstance().playSound("comms.leave");
    }
  };

  const checkMicPermission = async () => {
    try {
      (await navigator.mediaDevices?.getUserMedia?.({ audio: true }))
        ?.getTracks()
        .forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  };

  const toggleAudio = async () => {
    if (!room || !room.localParticipant) return;
    try {
      const newState = !isAudioEnabled;
      if (newState) {
        const permitted = await checkMicPermission();
        if (!permitted) {
          setError(t("chat.comms.error.noMicPermissionWarning"));
          return;
        }
      }
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioEnabled(newState);
    } catch (e) {
      console.error("Failed toggling microphone state", e);
      setError(getDeviceErrorMessage(t));
    }
  };

  const toggleVideo = async () => {
    if (!room || !room.localParticipant) return;

    await runCameraOperation(async () => {
      const newState = !room.localParticipant.isCameraEnabled;

      if (newState) {
        const permitted = await checkCameraPermission();
        if (!permitted) {
          setError(t("chat.comms.error.noCamPermissionWarning"));
          return;
        }
      }

      const finalizeVideoState = () => {
        const actuallyEnabled = room.localParticipant.isCameraEnabled;
        setIsVideoEnabled(actuallyEnabled);
        if (actuallyEnabled) {
          refreshLocalVideoStream();
        }
      };

      try {
        await applyCameraEnabledState(newState);
        finalizeVideoState();
        setError(null);
      } catch (e) {
        if (isAbortError(e)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          try {
            await applyCameraEnabledState(newState);
            finalizeVideoState();
            if (newState && !room.localParticipant.isCameraEnabled) {
              setError(getDeviceErrorMessage(t));
            } else {
              setError(null);
            }
            return;
          } catch (retryError) {
            if (isAbortError(retryError)) {
              syncVideoEnabledState();
              if (newState && !room.localParticipant.isCameraEnabled) {
                setError(getDeviceErrorMessage(t));
              }
              return;
            }
            e = retryError;
          }
        }

        console.error("Failed toggling video state", e);
        setError(getDeviceErrorMessage(t));
        syncVideoEnabledState();
      }
    });
  };

  const toggleAudioOutput = () => {
    setIsAudioOutputEnabled((prev) => !prev);
  };

  const toggleFacingMode = () => {
    if (Platform.OS !== "web") {
      switchMobileCamera();
      return;
    }
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const switchMobileCamera = async () => {
    if (Platform.OS === "web" || !room || !room.localParticipant) return;

    await runCameraOperation(async () => {
      try {
        if (!room.localParticipant.isCameraEnabled) {
          await room.localParticipant.setCameraEnabled(true, {
            facingMode: getCameraCaptureFacingMode(facingMode),
          });
          setIsVideoEnabled(true);
          refreshLocalVideoStream();
        }

        const publication = room.localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        const localVideoTrack = publication?.track;

        if (!(localVideoTrack instanceof LocalVideoTrack)) {
          console.warn("No local camera track available for switch");
          return;
        }

        const nextFacing = facingMode === "environment" ? "user" : "environment";
        const facingModeStr = getCameraRestartFacingMode(nextFacing);
        const devices = await Room.getLocalDevices("videoinput");
        let newDevice = null;

        for (const device of devices) {
          if (device.kind !== "videoinput") continue;
          const deviceFacing = device.facing || device.facingMode;
          if (deviceFacing === facingModeStr) {
            newDevice = device;
            break;
          }
        }

        if (!newDevice && devices.length > 1) {
          newDevice =
            devices.find((device) => device.deviceId !== cameraDevice) ||
            devices[1];
        }

        if (!newDevice) {
          newDevice = devices[0];
        }

        if (!newDevice) return;

        await localVideoTrack.restartTrack({
          deviceId: newDevice.deviceId,
          facingMode: facingModeStr,
        });

        setFacingMode(nextFacing);
        setCameraDevice(newDevice.deviceId);

        if (localVideoTrack.mediaStreamTrack) {
          const newStream = new MediaStream([localVideoTrack.mediaStreamTrack]);
          setStreams((prev) => ({
            ...prev,
            [room.localParticipant.identity]: newStream,
          }));
        }

        setError(null);
      } catch (e) {
        if (isAbortError(e)) {
          syncVideoEnabledState();
          return;
        }
        console.error("Failed switching mobile camera", e);
        setError(getDeviceErrorMessage(t));
        syncVideoEnabledState();
      }
    });
  };

  const switchActiveDevice = async (kind, deviceId, label) => {
    if (!room?.localParticipant || !deviceId) return;

    try {
      await room.switchActiveDevice(kind, deviceId);
      setError(null);
    } catch (e) {
      if (kind === "videoinput" && isAbortError(e)) return;
      // Expected on web browsers without setSinkId / audiooutput switching.
      if (kind === "audiooutput" && isUnsupportedWebAudioOutputError(e)) {
        return;
      }
      console.error(`Failed switching ${label} device`, e);
      setError(getDeviceErrorMessage(t));
    }
  };

  useEffect(() => {
    if (usesNativeAudioRouting) return;
    switchActiveDevice("audioinput", microphoneDevice, "microphone");
  }, [microphoneDevice, room]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    switchActiveDevice("videoinput", cameraDevice, "camera");
  }, [cameraDevice]);

  useEffect(() => {
    if (!room?.localParticipant || !speakerDevice) return;

    const applySpeaker = async () => {
      if (usesNativeAudioRouting) {
        try {
          await selectNativeAudioRoute(room, speakerDevice);
          setError(null);
        } catch (e) {
          console.error("Failed switching speaker route", e);
          setError(getDeviceErrorMessage(t));
        }
        return;
      }

      if (!supportsWebAudioOutputSelection) return;
      await switchActiveDevice("audiooutput", speakerDevice, "speaker");
    };

    applySpeaker();
  }, [room, speakerDevice]);

  const startScreenShare = async (sourceId = null, includeAudio = false) => {
    if (!room?.localParticipant) return;

    try {
      let tracks;

      if (platform === "desktop") {
        if (!sourceId) return;

        const stream =
          sourceId === "wayland"
            ? await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: includeAudio
                  ? {
                      echoCancellation: false,
                      noiseSuppression: false,
                      autoGainControl: false,
                    }
                  : false,
              })
            : await navigator.mediaDevices.getUserMedia({
                audio: includeAudio
                  ? {
                      mandatory: {
                        chromeMediaSource: "desktop",
                      },
                    }
                  : false,
                video: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: sourceId,
                  },
                },
              });

        tracks = stream.getTracks();
      } else {
        tracks = await room.localParticipant.createScreenTracks({
          audio: true,
        });
      }

      const published = await publishAssociatedScreenTracks(
        room.localParticipant,
        tracks,
      );

      setActiveScreenShares((prev) => {
        const next = { ...prev };
        for (const item of published) {
          next[item.trackSid] = item.track;
        }
        return next;
      });
    } catch (err) {
      console.log("Screenshare cancelled or failed:", err);
    }
  };

  const stopScreenShare = async (trackSid) => {
    if (!room?.localParticipant || !activeScreenShares[trackSid]) return;

    const videoTrack = activeScreenShares[trackSid];
    const associatedAudioSid = videoTrack.associatedAudioSid;

    if (videoTrack.stop) videoTrack.stop();
    await room.localParticipant.unpublishTrack(videoTrack);

    setActiveScreenShares((prev) => {
      const next = { ...prev };
      delete next[trackSid];

      if (associatedAudioSid && next[associatedAudioSid]) {
        const audioTrack = next[associatedAudioSid];
        if (audioTrack.stop) audioTrack.stop();
        room.localParticipant.unpublishTrack(audioTrack).catch(() => {});
        delete next[associatedAudioSid];
      }
      return next;
    });
  };

  useEffect(() => {
    if (platform !== "mobile") return;

    const micListener = DeviceEventEmitter.addListener(
      "comms_toggle_mic",
      toggleAudio,
    );
    const camListener = DeviceEventEmitter.addListener(
      "comms_toggle_cam",
      toggleVideo,
    );
    const leaveListener = DeviceEventEmitter.addListener(
      "comms_leave_voice",
      leave,
    );

    return () => {
      micListener.remove();
      camListener.remove();
      leaveListener.remove();
    };
  }, [room, isAudioEnabled, isVideoEnabled]);

  return {
    connecting,
    connected,
    roomMatch,
    isAudioEnabled,
    isAudioOutputEnabled,
    isVideoEnabled,
    microphoneDevice,
    cameraDevice,
    speakerDevice,
    facingMode,
    pinnedStreamUUID,
    fullscreenStreamUUID,
    join,
    leave,
    toggleAudio,
    toggleAudioOutput,
    toggleVideo,
    toggleFacingMode,
    switchMobileCamera,
    setMicrophoneDevice,
    setCameraDevice,
    setSpeakerDevice,
    setFacingMode,
    startScreenShare,
    stopScreenShare,
    setPinnedStreamUUID,
    setFullScreenStreamUUID,
    error,
    clearError,
  };
};

export default useCommsAction;

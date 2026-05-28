import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCommsContext } from "@/src/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";
import { connectToLiveKit } from "@/src/utils/comms/livekit";
import { Room, Track } from "livekit-client";

import platform from "@/src/utils/device/type";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";

const getDeviceErrorMessage = (t) =>
  t("chat.bottomBar.overview.errors.deviceError", {
    troubleshooting: t("common.troubleshooting"),
    link: t("chat.bottomBar.overview.errors.troubleshootingLink"),
  });

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
    isVideoEnabled,
    setIsVideoEnabled,
    error,
    setError,
    setStreams,
  } = useCommsContext();

  const { t } = useTranslation();

  const [connecting, setConnecting] = useState(false);
  const [roomMatch, setRoomMatch] = useState(false);
  const clearError = () => setError(null);

  const [microphoneDevice, setMicrophoneDevice] = useState(null);
  const [cameraDevice, setCameraDevice] = useState(null);
  const [speakerDevice, setSpeakerDevice] = useState(null);

  const isMobile = platform === "mobile";

  // @SamueleOrazioDurante temp init function, this will be removed in the 1.2 with the comms settings menù implementation
  const initHardwareDevices = async (roomInstance) => {
    if (!roomInstance || !roomInstance.localParticipant) return;

    let microphone = roomInstance.getActiveDevice("audioinput");
    let camera = roomInstance.getActiveDevice("videoinput");
    let speaker = roomInstance.getActiveDevice("audiooutput");

    // Force selecting a real hardware ID if the current one is "default" or null
    if (!microphone || microphone === "default") {
      try {
        const devices = await Room.getLocalDevices("audioinput");
        if (devices.length > 0) {
          microphone = devices[0].deviceId;
          await roomInstance.switchActiveDevice("audioinput", microphone);
        }
      } catch (e) {
        console.error("Failed to list audio devices", e);
      }
    }

    if (!camera || camera === "default") {
      try {
        const devices = await Room.getLocalDevices("videoinput");
        if (devices.length > 0) {
          camera = devices[0].deviceId;
          await roomInstance.switchActiveDevice("videoinput", camera);
        }
      } catch (e) {
        console.error("Failed to list video devices", e);
      }
    }

    setMicrophoneDevice(microphone);
    setCameraDevice(camera);
    setSpeakerDevice(speaker);
  };

  useEffect(() => {
    setRoomMatch(checkRoomMatch(chatUUID, sub));
  }, [chatUUID, sub, checkRoomMatch]);

  useEffect(() => {
    if (room && room.localParticipant) {
      setIsAudioEnabled(room.localParticipant.isMicrophoneEnabled);
      setIsVideoEnabled(room.localParticipant.isCameraEnabled);

      const refresh = async () => {
        await initHardwareDevices(room);
      };

      refresh();
    } else {
      setIsAudioEnabled(false);
      setIsVideoEnabled(false);

      setMicrophoneDevice(null);
      setCameraDevice(null);
      setSpeakerDevice(null);
    }
  }, [room]);

  const join = async () => {
    setConnecting(true);
    if (connected) {
      leave();
    }

    try {
      const { success, token, url } = await gateway.comms.getToken(
        chatUUID,
        sub,
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

      setRoom(roomInstance);

      SoundPlayer.getInstance().playSound("comms.join");

      setTimeout(async () => {
        if (roomInstance.localParticipant) {
          try {
            await roomInstance.localParticipant.setMicrophoneEnabled(true);
            setMicrophoneDevice(roomInstance.getActiveDevice("audioinput"));
            setIsAudioEnabled(true);
            setFacingMode("environment");
            setError(null);
          } catch (err) {
            console.error("Failed enabling microphone after join", err);
            setError(getDeviceErrorMessage(t));
          }
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
      reset();
      SoundPlayer.getInstance().playSound("comms.leave");
    }
  };

  const toggleAudio = async () => {
    if (!room || !room.localParticipant) return;
    try {
      const newState = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioEnabled(newState);
    } catch (e) {
      console.error("Failed toggling microphone state", e);
      setError(getDeviceErrorMessage(t));
    }
  };

  const toggleVideo = async () => {
    if (!room || !room.localParticipant) return;
    try {
      const newState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch (e) {
      console.error("Failed toggling video state", e);
      setError(getDeviceErrorMessage(t));
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    async function switchMicrophone() {
      if (!room || !room.localParticipant || !microphoneDevice) return;
      try {
        await room.switchActiveDevice("audioinput", microphoneDevice);
        setError(null);
      } catch (e) {
        console.error("Failed switching microphone device", e);
        setError(getDeviceErrorMessage(t));
      }
    }
    switchMicrophone();
  }, [microphoneDevice]);

  useEffect(() => {
    async function switchCamera() {
      if (!room || !room.localParticipant || !cameraDevice) return;
      try {
        await room.switchActiveDevice("videoinput", cameraDevice);
        setError(null);
      } catch (e) {
        console.error("Failed switching camera device", e);
        setError(getDeviceErrorMessage(t));
      }
    }
    switchCamera();
  }, [cameraDevice]);

  useEffect(() => {
    async function switchSpeaker() {
      if (!room || !room.localParticipant || !speakerDevice || isMobile) return;
      try {
        const deviceId =
          typeof speakerDevice === "string"
            ? speakerDevice
            : speakerDevice.deviceId;
        if (!deviceId || room.getActiveDevice("audiooutput") === deviceId)
          return;

        await room.switchActiveDevice("audiooutput", deviceId);
        setError(null);
      } catch (e) {
        console.error("Failed switching speaker device", e);
      }
    }
    switchSpeaker();
  }, [speakerDevice, room, isMobile]);

  useEffect(() => {
    async function switchFacingMode() {
      if (!room || !room.localParticipant) return;
      try {
        const cameraInstance =
          await room.localParticipant.setCameraEnabled(isVideoEnabled); // get camera instance
        if (!cameraInstance) return;

        const videoTrack = cameraInstance.track;
        await videoTrack.restartTrack({
          facingMode,
        });

        // Refresh the local stream in context to trigger UI update
        if (room.localParticipant) {
          const newStream = new MediaStream([videoTrack.mediaStreamTrack]);
          setStreams((prev) => ({
            ...prev,
            [room.localParticipant.identity]: newStream,
          }));
        }
      } catch (e) {
        console.error("Failed switching camera facing mode", e);
        setError(getDeviceErrorMessage(t));
      }
    }
    switchFacingMode();
  }, [facingMode]);

  const startScreenShare = async () => {
    if (!room || !room.localParticipant) return;

    if (platform === "desktop") {
      const picked = await window.electron.rpc.request(
        "screenshare:pick-source",
      );
      if (!picked) return; // User cancelled

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      for (const track of stream.getTracks()) {
        const isVideo = track.kind === "video";
        const source = isVideo
          ? Track.Source.ScreenShare
          : Track.Source.ScreenShareAudio;

        const publication = await room.localParticipant.publishTrack(track, {
          source,
        });

        if (isVideo) {
          setActiveScreenShares((prev) => ({
            ...prev,
            [publication.trackSid]: track,
          }));
        }
      }
    } else {
      const screenTracks = await room.localParticipant.createScreenTracks({
        audio: true,
      });
      for (const track of screenTracks) {
        const publication = await room.localParticipant.publishTrack(track);
        setActiveScreenShares((prev) => ({
          ...prev,
          [publication.trackSid]: track,
        }));
      }
    }
  };

  const stopScreenShare = async (trackSid) => {
    if (!room || !room.localParticipant) return;
    if (activeScreenShares[trackSid]) {
      await room.localParticipant.unpublishTrack(activeScreenShares[trackSid]);
      setActiveScreenShares((prev) => {
        const newMap = { ...prev };
        delete newMap[trackSid];
        return newMap;
      });
    }
  };

  return {
    connecting,
    connected,
    roomMatch,
    isAudioEnabled,
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
    toggleVideo,
    toggleFacingMode,
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

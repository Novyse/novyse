import { useState, useEffect } from "react";
import { useCommsContext } from "@/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";
import { connectToLiveKit } from "@/src/utils/comms/livekit";

import platform from "@/src/utils/device/type";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";

// user-facing error text (HTML allowed for link)
const DEVICE_ERROR_MESSAGE =
  'We couldn\'t retrieve the device. Please try again. <a href="https://example.com/troubleshooting" target="_blank">Troubleshooting</a>';

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
  } = useCommsContext();

  const [connecting, setConnecting] = useState(false);
  const [roomMatch, setRoomMatch] = useState(false);
  const [error, setError] = useState(null);
  const clearError = () => setError(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  const [microphoneDevice, setMicrophoneDevice] = useState(null);
  const [cameraDevice, setCameraDevice] = useState(null);
  const [speakerDevice, setSpeakerDevice] = useState(null);

  const isMobile = platform === "mobile";

  useEffect(() => {
    setRoomMatch(checkRoomMatch(chatUUID, sub));
  }, [chatUUID, sub, checkRoomMatch]);

  useEffect(() => {
    if (room && room.localParticipant) {
      setIsAudioEnabled(room.localParticipant.isMicrophoneEnabled);
      setIsVideoEnabled(room.localParticipant.isCameraEnabled);

      const microphone = room.getActiveDevice("audioinput");
      const camera = room.getActiveDevice("videoinput");
      const speaker = room.getActiveDevice("audiooutput");

      setMicrophoneDevice(microphone);
      setCameraDevice(camera);
      setSpeakerDevice(speaker);
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

    const { success, token, url } = await gateway.comms.getToken(chatUUID, sub);

    if (!success) {
      console.error("Failed to get token for LiveKit");
      return;
    }

    const roomInstance = await connectToLiveKit(url, token);

    if (!roomInstance) {
      console.error("Failed to connect to LiveKit");
      return;
    }

    setRoom(roomInstance);

    SoundPlayer.getInstance().playSound("comms.join");

    setConnecting(false);

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
          setError(DEVICE_ERROR_MESSAGE);
        }
      }
    }, 1000);
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
      console.error("Failed switching microphone device", e);
      setError(DEVICE_ERROR_MESSAGE);
    }
  };

  const toggleVideo = async () => {
    if (!room || !room.localParticipant) return;
    try {
      const newState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch (e) {
      console.error("Failed switching microphone device", e);
      setError(DEVICE_ERROR_MESSAGE);
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
        setError(DEVICE_ERROR_MESSAGE);
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
        setError(DEVICE_ERROR_MESSAGE);
      }
    }
    switchCamera();
  }, [cameraDevice]);

  useEffect(() => {
    async function switchSpeaker() {
      if (!room || !room.localParticipant || !speakerDevice || isMobile) return;
      try {
        await room.switchActiveDevice("audiooutput", speakerDevice);
        setError(null);
      } catch (e) {
        console.error("Failed switching speaker device", e);
        setError(DEVICE_ERROR_MESSAGE);
      }
    }
    switchSpeaker();
  }, [speakerDevice]);

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
      } catch (e) {
        console.error("Failed switching camera facing mode", e);
        setError(DEVICE_ERROR_MESSAGE);
      }
    }
    switchFacingMode();
  }, [facingMode]);

  const startScreenShare = async () => {
    if (!room || !room.localParticipant) return;
    const screenTracks = await room.localParticipant.createScreenTracks();
    for (const track of screenTracks) {
      const publication = await room.localParticipant.publishTrack(track);
      setActiveScreenShares((prev) => ({
        ...prev,
        [publication.trackSid]: track,
      }));
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

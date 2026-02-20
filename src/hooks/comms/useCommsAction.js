import { useState, useEffect } from "react";
import { useCommsContext } from "@/context/CommsContext";
import gateway from "@/src/utils/backend-services/api-gateway";
import { connectToLiveKit } from "@/src/utils/comms/livekit";

import SoundPlayer from "@/src/utils/sounds/SoundPlayer";

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
  } = useCommsContext();

  const [connecting, setConnecting] = useState(false);
  const [roomMatch, setRoomMatch] = useState(false);

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  const [microphoneDevice, setMicrophoneDevice] = useState(null);
  const [cameraDevice, setCameraDevice] = useState(null);
  const [speakerDevice, setSpeakerDevice] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  useEffect(() => {
    setRoomMatch(checkRoomMatch(chatUUID, sub));
  }, [chatUUID, sub, checkRoomMatch]);

  useEffect(() => {
    if (room && room.localParticipant) {
      setIsAudioEnabled(room.localParticipant.isMicrophoneEnabled);
      setIsVideoEnabled(room.localParticipant.isCameraEnabled);
    } else {
      setIsAudioEnabled(false);
      setIsVideoEnabled(false);
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
        await roomInstance.localParticipant.setMicrophoneEnabled(true);
        setMicrophoneDevice(roomInstance.getActiveDevice("audioinput"));
        setIsAudioEnabled(true);
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
    const newState = !isAudioEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsAudioEnabled(newState);
  };

  const toggleVideo = async () => {
    if (!room || !room.localParticipant) return;
    const newState = !isVideoEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    setIsVideoEnabled(newState);
  };

  useEffect(() => {
    async function switchMicrophone() {
      if (!room || !room.localParticipant || !microphoneDevice) return;
      await room.switchActiveDevice("audioinput", microphoneDevice);
    }
    switchMicrophone();
  }, [microphoneDevice]);

  useEffect(() => {
    async function switchCamera() {
      if (!room || !room.localParticipant || !cameraDevice) return;
      await room.switchActiveDevice("videoinput", cameraDevice);
    }
    switchCamera();
  }, [cameraDevice]);

  useEffect(() => {
    async function switchSpeaker() {
      if (!room || !room.localParticipant || !speakerDevice) return;
      await room.switchActiveDevice("audiooutput", speakerDevice);
    }
    switchSpeaker();
  }, [speakerDevice]);

  useEffect(() => {
    async function switchFacingMode() {
      if (!room || !room.localParticipant) return;
      return;
      const videoTrack = room.localParticipant.videoTracks.get();
      if (!videoTrack) return;
      await videoTrack.restartTrack({
        facingMode,
      });
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
    setMicrophoneDevice,
    setCameraDevice,
    setSpeakerDevice,
    setFacingMode,
    startScreenShare,
    stopScreenShare,
    setPinnedStreamUUID,
    setFullScreenStreamUUID,
  };
};

export default useCommsAction;
